import { useState } from 'react';
import styles from './AIChatWidget.module.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello, and thank you for visiting Smart Healthcare.',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const newUserMsg: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');

    // Simulate bot response (since this is just UI/UX for now)
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'This is a simulated response. The real AI backend will be connected later.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.widgetContainer}>
      {isOpen ? (
        <div className={styles.chatWindow}>
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <div className={styles.botAvatar}>AI</div>
              <div>
                <h3 className={styles.headerTitle}>Smart Healthcare AI</h3>
                <span className={styles.status}>Online</span>
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
            <div className={styles.connectionText}>Connection to support in progress...</div>
            {messages.map(msg => (
              <div key={msg.id} className={`${styles.messageWrapper} ${styles[msg.sender]}`}>
                {msg.sender === 'bot' && <div className={styles.msgAvatar}>AI</div>}
                <div className={styles.messageContent}>
                  <div className={styles.bubble}>{msg.text}</div>
                  <div className={styles.time}>{msg.sender === 'bot' ? 'Virtual Agent' : 'You'} - {formatTime(msg.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>

          <form className={styles.inputArea} onSubmit={handleSendMessage}>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="Type your message"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit" className={styles.sendButton} aria-label="Send message">
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
