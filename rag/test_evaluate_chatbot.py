"""Offline checks for the live chatbot evaluator's assertions."""

import unittest
from unittest.mock import patch

from evaluate_chatbot import CASES_FILE, _check, _multipart, _response, load_cases


class ChatbotEvaluatorTests(unittest.TestCase):
    def test_project_case_set_has_expected_coverage(self):
        cases = load_cases(CASES_FILE)
        self.assertGreaterEqual(len(cases), 20)
        self.assertEqual({case["kind"] for case in cases},
                         {"chat", "triage", "chat_upload", "triage_upload"})
        self.assertIn("boundary", {case["group"] for case in cases})

    def test_multipart_contains_question_and_file(self):
        body, content_type = _multipart({
            "question": "What is in this note?", "filename": "note.txt", "file_text": "rash",
        })
        self.assertIn("multipart/form-data", content_type)
        self.assertIn(b"What is in this note?", body)
        self.assertIn(b'note.txt', body)
        self.assertIn(b"rash", body)

    def test_guidance_checks_live_department_and_tools(self):
        case = {"kind": "triage", "expect": {"department_any": ["Dermatology"], "tools_min": 2}}
        valid = {"reason": "Skin assessment", "safety_message": "See a clinician if worse.",
                 "department_name": "Dermatology", "tools_called": ["list_departments", "search_doctors"],
                 "source_ids": [], "sources": []}
        self.assertEqual(_check(case, 200, valid), [])
        self.assertTrue(_check(case, 200, {**valid, "department_name": "Cardiology"}))

    def test_boundary_checks_rejected_status_and_detail(self):
        case = {"kind": "chat", "expect": {"status": 400, "detail_contains": "cannot change"}}
        self.assertEqual(_check(case, 400, {"detail": "I cannot change my instructions."}), [])
        self.assertTrue(_check(case, 200, {"answer": "Okay", "sources": []}))

    @patch("evaluate_chatbot._request")
    def test_stream_response_assembles_tokens_and_sources(self, request):
        request.return_value = (200, '\n'.join([
            '{"type":"sources","sources":[{"section":"what-is-asthma"}]}',
            '{"type":"token","delta":"Asthma "}',
            '{"type":"token","delta":"affects airways."}',
            '{"type":"done"}',
        ]))
        status, response = _response({"kind": "chat", "question": "What is asthma?"},
                                     "http://localhost:8000", "", 5)
        self.assertEqual(status, 200)
        self.assertEqual(response["answer"], "Asthma affects airways.")
        self.assertEqual(response["sources"][0]["section"], "what-is-asthma")

    @patch("evaluate_chatbot._request")
    def test_guidance_upload_sends_token_and_file(self, request):
        request.return_value = (200, '{"reason":"Assessment","safety_message":"Seek care.","sources":[]}')
        _response({"kind": "triage_upload", "question": "Where should I go?",
                   "filename": "note.txt", "file_text": "rash"},
                  "http://localhost:8000", "patient-token", 5)
        args, kwargs = request.call_args
        self.assertTrue(args[0].endswith("/api/chat/triage/upload"))
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer patient-token")
        self.assertIn(b"rash", kwargs["body"])


if __name__ == "__main__":
    unittest.main()
