import pytest
from app.config import get_label_map


class TestLabelMapping:
    def test_banana_maps_to_wet(self):
        label_map = get_label_map()
        assert label_map["label_map"]["banana"]["class"] == "wet"

    def test_bottle_maps_to_recyclable(self):
        label_map = get_label_map()
        assert label_map["label_map"]["bottle"]["class"] == "recyclable"

    def test_cell_phone_maps_to_hazardous(self):
        label_map = get_label_map()
        assert label_map["label_map"]["cell phone"]["class"] == "hazardous"

    def test_book_maps_to_dry(self):
        label_map = get_label_map()
        assert label_map["label_map"]["book"]["class"] == "dry"

    def test_default_class_is_dry(self):
        label_map = get_label_map()
        assert label_map["default_class"] == "dry"

    def test_unknown_label_uses_default(self):
        label_map = get_label_map()
        raw_label = "unknown_object_xyz"
        mapped = label_map["label_map"].get(raw_label, {
            "class": label_map["default_class"],
            "description": label_map["default_description"],
        })
        assert mapped["class"] == "dry"
