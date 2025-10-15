import unittest


# Minimal, in-file stubs so the tests are self-contained and runnable.
# In a real project, import the actual implementations instead.
def validate_user_session(user_session: dict | None) -> bool:
    if not user_session:
        return False
    return bool(user_session.get("id")) and bool(user_session.get("authorized"))


def validate_database_access(user_session: dict | None) -> bool:
    return validate_user_session(user_session)


_FAKE_DB = {
    "salad": {"calories": 150, "protein_g": 4},
    "empty_nutrient_item": None,  # Item exists but has no nutrient info
}


def get_item_nutrients(item_name: str):
    return _FAKE_DB.get(item_name)


class TestDatabaseValidator(unittest.TestCase):
    def test_valid_user_data(self):
        # Correct: the correct user session is stored and access to database is authorized
        user_session = {"id": "user_123", "authorized": True}
        self.assertTrue(validate_user_session(user_session))
        self.assertTrue(validate_database_access(user_session))

    def test_invalid_auth_to_database(self):
        # Incorrect: the incorrect/null user session is stored and access to database is unauthorized
        user_session = None
        self.assertFalse(validate_user_session(user_session))
        self.assertFalse(validate_database_access(user_session))

        user_session = {"id": "user_123", "authorized": False}
        self.assertFalse(validate_user_session(user_session))
        self.assertFalse(validate_database_access(user_session))

    def test_boundary_invalid_item_access(self):
        # Boundary: a request for the nutrients of an item that does not exist in the database is queried, nothing should be returned from the database
        self.assertIsNone(get_item_nutrients("invalid_item"))

    def test_item_with_no_nutrient_data(self):
        # Edge case: item exists in database but has no nutrient info
        self.assertIsNone(get_item_nutrients("empty_nutrient_item"))


if __name__ == "__main__":
    unittest.main()


