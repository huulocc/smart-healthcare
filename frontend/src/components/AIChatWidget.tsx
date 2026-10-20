import { useEffect, useRef, useState } from 'react';
import styles from './AIChatWidget.module.css';
import {
  ChatError,
  checkChatHealth,
  streamChatMessage,
  type ChatSource,
} from '../services/chatApi';

/** What the assistant is doing, driven by real stream events rather than a timer. */
type Phase = 'searching' | 'reading' | 'thinking' | 'writing';

interface Pending {
  phase: Phase;
  text: string;
  sources: ChatSource[];
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  sources?: ChatSource[];
  isError?: boolean;
}

const AIChatWidget = ({ inline = false }: { inline?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello, and thank you for visiting Smart Healthcare. I can answer questions about the asthma information leaflet.',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [waitedSeconds, setWaitedSeconds] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check once when the panel opens, so an unavailable service is visible
  // before the user types a question and waits for it to fail. A null result
  // means the check could not be reached at all, which is also offline - the
  // endpoint is part of the contract any backend serving /api/chat must meet.
  useEffect(() => {
    if (!isOpen) return;
    checkChatHealth().then(status => setIsOffline(status === null || !status.ready));
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  // Reasoning runs for tens of seconds before the first answer token, so the
  // wait needs a counter alongside the phase label.
  useEffect(() => {
    if (!isSending) return;
    setWaitedSeconds(0);
    const timer = setInterval(() => setWaitedSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isSending]);

  const handleSendMessage = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const question = inputValue.trim();
    if (!question || isSending) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      text: question,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsSending(true);
    setPending({ phase: 'searching', text: '', sources: [] });

    // Held outside state as well, because the final message is built when the
    // stream ends and the state value captured in this closure would be stale.
    let capturedSources: ChatSource[] = [];

    try {
      const full = await streamChatMessage(question, {
        onSources: sources => {
          capturedSources = sources;
          setPending(p => (p ? { ...p, sources, phase: 'reading' } : p));
        },
        onThinking: () => setPending(p => (p ? { ...p, phase: 'thinking' } : p)),
        onToken: delta =>
          setPending(p => (p ? { ...p, phase: 'writing', text: p.text + delta } : p)),
      });
      setMessages(prev => [...prev, {
        id: `${Date.now()}-bot`,
        text: full,
        sender: 'bot',
        timestamp: new Date(),
        sources: capturedSources
      }]);
      setIsOffline(false);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `${Date.now()}-err`,
        text: error instanceof ChatError
          ? error.message
          : 'Something went wrong while answering. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      }]);
      // A failed send is better evidence than the check done when the panel
      // opened, so let the header reflect it.
      setIsOffline(true);
    } finally {
      setIsSending(false);
      setPending(null);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // The same section can back more than one retrieved chunk; show each once.
  const uniqueSections = (sources: ChatSource[]) =>
    Array.from(new Map(sources.map(s => [s.section, s])).values());

  const phaseLabel = (p: Pending) => {
    if (p.phase === 'searching') return 'Searching the leaflets';
    if (p.phase === 'reading') {
      return `Reading ${p.sources.length} section${p.sources.length === 1 ? '' : 's'}`;
    }
    return 'Thinking';
  };

  const renderSources = (sources: ChatSource[]) => (
    <div className={styles.sources}>
      {uniqueSections(sources).map(source => (
        <span
          key={source.section}
          className={styles.sourceChip}
          title={`${source.document} - page ${source.pages}`}
        >
          {source.heading}
        </span>
      ))}
    </div>
  );

  return (
    <div className={`${styles.widgetContainer} ${inline ? styles.inlineWidget : ''}`}>
      {isOpen ? (
        <div className={styles.chatWindow}>
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <div className={styles.botAvatar}>AI</div>
              <div>
                <h3 className={styles.headerTitle}>Smart Healthcare AI</h3>
                <span className={styles.status}>{isOffline ? 'Offline' : 'Online'}</span>
              </div>
            </div>
            <button
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className={styles.messagesArea}>
            <div className={styles.connectionText}>
              {isOffline
                ? 'The assistant is unavailable right now.'
                : 'Answers come from our patient information leaflets.'}
            </div>
            {messages.map(msg => (
              <div key={msg.id} className={`${styles.messageWrapper} ${styles[msg.sender]}`}>
                {msg.sender === 'bot' && <div className={styles.msgAvatar}>AI</div>}
                <div className={styles.messageContent}>
                  <div className={`${styles.bubble} ${msg.isError ? styles.errorBubble : ''}`}>
                    {msg.text}
                  </div>
                  {msg.sources && msg.sources.length > 0 && renderSources(msg.sources)}
                  <div className={styles.time}>{msg.sender === 'bot' ? 'Virtual Agent' : 'You'} - {formatTime(msg.timestamp)}</div>
                </div>
              </div>
            ))}
            {pending && (
              <div className={`${styles.messageWrapper} ${styles.bot}`}>
                <div className={styles.msgAvatar}>AI</div>
                <div className={styles.messageContent}>
                  {pending.phase === 'writing' ? (
                    <div className={styles.bubble}>
                      {pending.text}
                      <span className={styles.caret} />
                    </div>
                  ) : (
                    // The model's raw reasoning is NOT shown. It arrives first
                    // and would fill this wait nicely, but it is unedited
                    // working-out that can contain half-formed medical claims -
                    // not something to put in front of a patient. The phase
                    // label and the sources below are real progress signals
                    // without that risk.
                    <div className={`${styles.bubble} ${styles.typing}`}>
                      <span className={styles.dots}><span>.</span><span>.</span><span>.</span></span>
                      <span className={styles.elapsed}>
                        {phaseLabel(pending)}
                        {waitedSeconds >= 10 ? ` - ${waitedSeconds}s` : ''}
                      </span>
                    </div>
                  )}
                  {pending.sources.length > 0 && renderSources(pending.sources)}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.inputArea} onSubmit={handleSendMessage}>
            <input
              type="text"
              className={styles.input}
              placeholder={isSending ? 'Waiting for an answer...' : 'Type your message'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              // Enter is how people expect to send a chat message; relying on
              // the form's implicit submit alone proved unreliable here.
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  void handleSendMessage(e);
                }
              }}
              disabled={isSending}
              maxLength={500}
            />
            <button
              type="submit"
              className={styles.sendButton}
              aria-label="Send message"
              disabled={isSending || !inputValue.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      ) : (
        <div className={styles.launcherWrapper}>
          <div className={styles.greetingBubble}>
            <button
              className={styles.dismissGreeting}
              onClick={(e) => {
                e.stopPropagation();
                // We could add state to permanently hide greeting, but keeping it simple for now
                const el = e.currentTarget.parentElement;
                if (el) el.style.display = 'none';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className={styles.greetingText}>
              <span className={styles.wave}>👋</span> Hi there!<br/>
              How can we help you today?
            </div>
            <div className={styles.triangle}></div>
          </div>

          <button
            className={styles.launcherButton}
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Chat"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default AIChatWidget;
