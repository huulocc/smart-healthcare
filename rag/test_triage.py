"""Contract tests with model and Spring calls replaced by local fakes."""

import unittest
from unittest.mock import patch

from errors import ModelError
from triage import _json_object, recommend


HITS = [{"section_id": "asthma-attack", "text": "Seek clinical help for severe symptoms."}]
DEPARTMENTS = [{"id": 2, "name": "General Medicine", "description": "General assessment"}]
DOCTORS = [{"id": 9, "name": "Dr A", "departmentId": 2}]
AVAILABILITY = {"doctor_id": 9, "timezone": "Asia/Bangkok", "slots": [{"date": "2026-10-25"}]}
DECISION = {
    "urgency": "routine", "department_id": 2, "doctor_id": 9,
    "reason": "General assessment is appropriate for these symptoms.",
    "safety_message": "Seek urgent care if symptoms worsen.",
    "source_ids": ["asthma-attack"],
}


class TriageTests(unittest.TestCase):
    def test_invalid_model_json_is_rejected(self):
        with self.assertRaises(ModelError):
            _json_object("not JSON")

    def run_agent(self, replies):
        with patch("triage._call_model", side_effect=replies) as model, \
             patch("triage.list_departments", return_value=DEPARTMENTS) as departments, \
             patch("triage.search_doctors", return_value=DOCTORS) as doctors, \
             patch("triage.get_availability", return_value=AVAILABILITY) as availability:
            result = recommend("I have symptoms", HITS, "test-token")
        return result, model, departments, doctors, availability

    def test_three_model_requested_tools_and_validated_result(self):
        replies = [
            {"tool": "list_departments", "arguments": {}},
            {"tool": "search_doctors", "arguments": {"department_id": 2}},
            {"tool": "get_availability", "arguments": {"doctor_id": 9}},
            DECISION,
        ]
        result, model, departments, doctors, availability = self.run_agent(replies)
        self.assertEqual(result[1], ["list_departments", "search_doctors", "get_availability"])
        self.assertEqual(result[0].department_id, 2)
        self.assertEqual(result[2:], ("General Medicine", "Dr A"))
        self.assertEqual(model.call_count, 4)
        departments.assert_called_once_with("test-token")
        doctors.assert_called_once_with("test-token", 2)
        availability.assert_called_once_with("test-token", 9)

    def test_rejects_invented_department_before_doctor_search(self):
        replies = [
            {"tool": "list_departments", "arguments": {}},
            {"tool": "search_doctors", "arguments": {"department_id": 999}},
        ]
        with self.assertRaises(ModelError):
            self.run_agent(replies)

    def test_rejects_invented_source_in_final_json(self):
        replies = [
            {"tool": "list_departments", "arguments": {}},
            {"tool": "search_doctors", "arguments": {"department_id": 2}},
            {"tool": "get_availability", "arguments": {"doctor_id": 9}},
            {**DECISION, "source_ids": ["invented"]},
        ]
        with self.assertRaises(ModelError):
            self.run_agent(replies)

    def test_emergency_does_not_offer_a_doctor(self):
        replies = [
            {"tool": "list_departments", "arguments": {}},
            {"tool": "search_doctors", "arguments": {"department_id": 2}},
            {"tool": "get_availability", "arguments": {"doctor_id": 9}},
            {**DECISION, "urgency": "emergency"},
        ]
        result, *_ = self.run_agent(replies)
        self.assertIsNone(result[0].doctor_id)
        self.assertIsNone(result[3])

    def test_no_open_slots_does_not_offer_a_doctor(self):
        replies = [
            {"tool": "list_departments", "arguments": {}},
            {"tool": "search_doctors", "arguments": {"department_id": 2}},
            {"tool": "get_availability", "arguments": {"doctor_id": 9}},
            DECISION,
        ]
        with patch("triage._call_model", side_effect=replies), \
             patch("triage.list_departments", return_value=DEPARTMENTS), \
             patch("triage.search_doctors", return_value=DOCTORS), \
             patch("triage.get_availability", return_value={**AVAILABILITY, "slots": []}):
            result = recommend("I have symptoms", HITS, "test-token")
        self.assertEqual(result[0].department_id, 2)
        self.assertIsNone(result[0].doctor_id)

    def test_rejects_doctor_outside_selected_department(self):
        replies = [
            {"tool": "list_departments", "arguments": {}},
            {"tool": "search_doctors", "arguments": {"department_id": 2}},
            {"tool": "get_availability", "arguments": {"doctor_id": 9}},
            DECISION,
        ]
        with patch("triage.search_doctors", return_value=[{"id": 9, "name": "Dr A", "departmentId": 8}]), \
             patch("triage.list_departments", return_value=DEPARTMENTS), \
             patch("triage.get_availability", return_value=AVAILABILITY), \
             patch("triage._call_model", side_effect=replies):
            with self.assertRaises(ModelError):
                recommend("I have symptoms", HITS, "test-token")


if __name__ == "__main__":
    unittest.main()
