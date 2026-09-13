from datetime import date

from monoscope.rates import RateLookup


def test_monobank_fallback_uses_sell_rate_for_direct_fiat_pair() -> None:
    rates = RateLookup()
    rates._monobank_rates = [
        {
            "currencyCodeA": 978,
            "currencyCodeB": 980,
            "rateBuy": 51.4,
            "rateSell": 52.0698,
        }
    ]

    assert rates._monobank_cross_rate(978, 980) == 52.0698


def test_eur_lookup_falls_back_to_monobank_sell_rate_when_nbu_is_unavailable(
    monkeypatch,
) -> None:
    rates = RateLookup()
    monkeypatch.setattr(rates, "_nbu_rate", lambda _code, _date: None)
    rates._monobank_rates = [
        {
            "currencyCodeA": 978,
            "currencyCodeB": 980,
            "rateSell": 52.0698,
        }
    ]

    assert rates.uah_per_eur(date(2026, 9, 13)) == (52.0698, "monobank")
