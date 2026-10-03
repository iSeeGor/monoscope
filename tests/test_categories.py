from monoscope.categories import categorize, category_for_mcc


def test_category_for_known_and_unknown_mcc() -> None:
    assert category_for_mcc(5411) == "Продукти"
    assert category_for_mcc(5942) == "Книги"
    assert category_for_mcc(9999) == "Інше"
    assert category_for_mcc(None) == "Інше"


def test_custom_rule_requires_description_and_matching_mcc() -> None:
    assert categorize(5734, "OPENAI *ChatGPT Subscription") == "Підписки та AI"
    assert categorize(5411, "OpenAI Cafe") == "Продукти"


def test_custom_rule_matching_is_case_insensitive() -> None:
    assert categorize(7399, "Google One") == "Підписки та AI"
    assert categorize(5411, "fresh zone 2014 ltd") == "Кафе та ресторани"
