import unittest
from unittest.mock import MagicMock, patch
import urllib.error

import config
from telemetry import estimate_tokens, generate_request_id, send_telemetry


class TestTelemetry(unittest.TestCase):

    def test_estimate_tokens(self):
        self.assertEqual(estimate_tokens(""), 0)
        self.assertGreater(estimate_tokens("What are the symptoms of asthma?"), 0)
        long_text = "word " * 100
        self.assertGreaterEqual(estimate_tokens(long_text), 100)

    def test_generate_request_id(self):
        req1 = generate_request_id()
        req2 = generate_request_id()
        self.assertTrue(req1.startswith("REQ-AI-"))
        self.assertTrue(req2.startswith("REQ-AI-"))
        self.assertNotEqual(req1, req2)

    @patch("config.TELEMETRY_ENABLED", False)
    def test_send_telemetry_disabled(self):
        result = send_telemetry(feature="CHAT")
        self.assertFalse(result)

    @patch("config.TELEMETRY_SECRET", "test-telemetry-secret")
    @patch("urllib.request.urlopen")
    def test_send_telemetry_success(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.status = 201
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        success = send_telemetry(
            feature="CHAT",
            provider="GOOGLE",
            model="gemini-2.5-flash",
            prompt_tokens=150,
            completion_tokens=75,
            latency_ms=420,
            status="SUCCESS",
            request_id="REQ-AI-TEST1234",
        )
        self.assertTrue(success)
        self.assertTrue(mock_urlopen.called)
        req = mock_urlopen.call_args[0][0]
        self.assertEqual(
            req.get_header("X-telemetry-secret"),
            "test-telemetry-secret",
        )

    @patch("config.TELEMETRY_SECRET", "")
    @patch("urllib.request.urlopen")
    def test_missing_secret_does_not_send(self, mock_urlopen):
        self.assertFalse(send_telemetry(feature="CHAT"))
        mock_urlopen.assert_not_called()

    @patch("config.TELEMETRY_SECRET", "test-telemetry-secret")
    @patch("urllib.request.urlopen")
    def test_send_telemetry_failure_does_not_raise(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.URLError("Connection refused")

        # Telemetry failures must be non-blocking and never raise
        success = send_telemetry(
            feature="STREAM",
            provider="GOOGLE",
            model="gemini-2.5-flash",
            prompt_tokens=100,
            completion_tokens=50,
            latency_ms=300,
            status="SUCCESS",
        )
        self.assertFalse(success)

    @patch("config.TELEMETRY_SECRET", "test-telemetry-secret")
    @patch("urllib.request.urlopen")
    def test_send_telemetry_http_error_does_not_raise(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://test", code=401, msg="Unauthorized", hdrs={}, fp=None
        )

        success = send_telemetry(
            feature="TRIAGE",
            status="FAILED",
            error_code="MODEL_ERROR",
            error_message="Upstream API error",
        )
        self.assertFalse(success)


if __name__ == "__main__":
    unittest.main()
