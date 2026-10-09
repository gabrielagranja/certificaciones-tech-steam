(() => {
    const countryCurrency = {
        ES: 'EUR', EU: 'EUR', US: 'USD', GB: 'GBP', CH: 'CHF', JP: 'JPY',
        CZ: 'CZK', DK: 'DKK', HU: 'HUF', PL: 'PLN', RO: 'RON', SE: 'SEK',
        IS: 'ISK', NO: 'NOK', TR: 'TRY', AU: 'AUD', BR: 'BRL', CA: 'CAD'
    };
    const countryLocale = {
        ES: 'es-ES', EU: 'es-ES', US: 'en-US', GB: 'en-GB', CH: 'de-CH', JP: 'ja-JP',
        CZ: 'cs-CZ', DK: 'da-DK', HU: 'hu-HU', PL: 'pl-PL', RO: 'ro-RO', SE: 'sv-SE',
        IS: 'is-IS', NO: 'nb-NO', TR: 'tr-TR', AU: 'en-AU', BR: 'pt-BR', CA: 'en-CA'
    };
    const currencyLabels = {
        EUR: 'Euro (EUR)', USD: 'Dólar estadounidense (USD)', GBP: 'Libra esterlina (GBP)',
        CHF: 'Franco suizo (CHF)', JPY: 'Yen japonés (JPY)', CZK: 'Corona checa (CZK)',
        DKK: 'Corona danesa (DKK)', HUF: 'Forinto húngaro (HUF)', PLN: 'Zloty polaco (PLN)',
        RON: 'Leu rumano (RON)', SEK: 'Corona sueca (SEK)', ISK: 'Corona islandesa (ISK)',
        NOK: 'Corona noruega (NOK)', TRY: 'Lira turca (TRY)', AUD: 'Dólar australiano (AUD)',
        BRL: 'Real brasileño (BRL)', CAD: 'Dólar canadiense (CAD)'
    };

    // ECB reference rates for 8 Oct 2026, used when the live rate endpoint is unavailable.
    const fallbackEurRates = {
        EUR: 1, USD: 1.1186, JPY: 177.05, CZK: 24.403, DKK: 7.4739, GBP: 0.84698,
        HUF: 366.25, PLN: 4.3753, RON: 5.3434, SEK: 11.1940, CHF: 0.9326,
        ISK: 137.00, NOK: 10.7170, TRY: 55.0523, AUD: 1.6110, BRL: 5.6118, CAD: 1.5953
    };
    let eurRates = fallbackEurRates;
    let rateDate = '2026-10-08';
    let selectedCountry = 'ES';
    let selectedCurrency = 'EUR';

    const readPreference = (key, fallback) => {
        try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
    };
    const savePreference = (key, value) => {
        try { localStorage.setItem(key, value); } catch { /* Keep the current selection for this visit. */ }
    };

    function currencyRate(currency) {
        return eurRates[currency] || fallbackEurRates[currency] || 1;
    }

    function convertAmount(amount, baseCurrency = 'USD') {
        return Number(amount) * currencyRate(selectedCurrency) / currencyRate(baseCurrency);
    }

    function selectedLocale() {
        return countryLocale[selectedCountry] || 'es-ES';
    }

    function fractionDigits(maximum) {
        if (maximum !== undefined && maximum !== null && maximum !== '') return Number(maximum);
        return ['JPY', 'HUF', 'ISK'].includes(selectedCurrency) ? 0 : 2;
    }

    function formatBaseAmount(amount, baseCurrency = 'USD', maximumFractionDigits) {
        return new Intl.NumberFormat(selectedLocale(), {
            style: 'currency',
            currency: selectedCurrency,
            maximumFractionDigits: fractionDigits(maximumFractionDigits)
        }).format(convertAmount(amount, baseCurrency));
    }

    function formatUsd(amount, maximumFractionDigits) {
        return formatBaseAmount(amount, 'USD', maximumFractionDigits);
    }

    function formatUsdMillions(amount) {
        const converted = convertAmount(Number(amount) * 1000000, 'USD') / 1000000;
        const number = new Intl.NumberFormat(selectedLocale(), { maximumFractionDigits: 0 }).format(converted);
        const symbol = new Intl.NumberFormat(selectedLocale(), {
            style: 'currency', currency: selectedCurrency, maximumFractionDigits: 0
        }).formatToParts(0).find(part => part.type === 'currency')?.value || selectedCurrency;
        return `${number} M ${symbol}`;
    }

    function updatePrices() {
        document.querySelectorAll('[data-usd-price]').forEach((element) => {
            element.textContent = formatUsd(element.dataset.usdPrice, element.dataset.maxFractionDigits);
        });
        document.querySelectorAll('[data-original-usd]').forEach((element) => {
            element.textContent = `${formatUsd(element.dataset.originalUsd)} ${element.dataset.originalLabel || ''}`.trim();
        });
        document.querySelectorAll('[data-base-amount][data-base-currency]').forEach((element) => {
            element.textContent = formatBaseAmount(
                element.dataset.baseAmount,
                element.dataset.baseCurrency,
                element.dataset.maxFractionDigits
            );
        });
        document.querySelectorAll('[data-usd-millions]').forEach((element) => {
            element.textContent = formatUsdMillions(element.dataset.usdMillions);
        });
        const dateElement = document.getElementById('currency-rate-date');
        if (dateElement) {
            dateElement.textContent = new Intl.DateTimeFormat('es-ES', {
                day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
            }).format(new Date(`${rateDate}T00:00:00Z`));
        }
        if (typeof CustomEvent === 'function') {
            window.dispatchEvent(new CustomEvent('techcert:currencychange', {
                detail: { country: selectedCountry, currency: selectedCurrency }
            }));
        }
    }

    function updatePreference(countryChanged) {
        const countrySelect = document.getElementById('country-select');
        const currencySelect = document.getElementById('currency-select');
        if (countrySelect && countryCurrency[countrySelect.value]) {
            selectedCountry = countrySelect.value;
            if (countryChanged) {
                selectedCurrency = countryCurrency[selectedCountry];
                if (currencySelect) currencySelect.value = selectedCurrency;
            }
        }
        if (currencySelect && currencyLabels[currencySelect.value]) selectedCurrency = currencySelect.value;
        savePreference('techcert-country-v2', selectedCountry);
        savePreference('techcert-currency-v2', selectedCurrency);
        updatePrices();
    }

    function initSelectors() {
        const countrySelect = document.getElementById('country-select');
        const currencySelect = document.getElementById('currency-select');
        if (countrySelect && countryCurrency[readPreference('techcert-country-v2', 'ES')]) {
            selectedCountry = readPreference('techcert-country-v2', 'ES');
            countrySelect.value = selectedCountry;
        }
        if (currencySelect && currencyLabels[readPreference('techcert-currency-v2', 'EUR')]) {
            selectedCurrency = readPreference('techcert-currency-v2', 'EUR');
            currencySelect.value = selectedCurrency;
        } else if (currencySelect) {
            currencySelect.value = selectedCurrency;
        }
        countrySelect?.addEventListener('change', () => updatePreference(true));
        currencySelect?.addEventListener('change', () => updatePreference(false));
        updatePrices();
    }

    async function loadLatestRates() {
        const cached = readPreference('techcert-rates-cache', '');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.savedAt < 12 * 60 * 60 * 1000 && parsed.rates?.USD) {
                    eurRates = parsed.rates;
                    rateDate = parsed.date;
                    updatePrices();
                    return;
                }
            } catch { /* Ignore an invalid cache and request a fresh rate. */ }
        }

        try {
            const quotes = Object.keys(fallbackEurRates).filter(code => code !== 'EUR').join(',');
            const response = await fetch(`https://api.frankfurter.dev/v2/rates?base=eur&quotes=${quotes}&providers=ecb`, {
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) throw new Error('No se pudo consultar el tipo de cambio');
            const rows = await response.json();
            const latest = { EUR: 1 };
            rows.forEach(row => { latest[row.quote] = row.rate; });
            if (!latest.USD) throw new Error('La respuesta no contiene el cambio USD');
            eurRates = latest;
            rateDate = rows[0]?.date || rateDate;
            savePreference('techcert-rates-cache', JSON.stringify({ rates: latest, date: rateDate, savedAt: Date.now() }));
            updatePrices();
        } catch {
            updatePrices();
        }
    }

    window.updateTechCertPrices = updatePrices;
    window.convertTechCertAmount = convertAmount;
    window.formatTechCertAmount = formatBaseAmount;
    window.formatTechCertCompactAmount = (amount) => new Intl.NumberFormat(selectedLocale(), {
        style: 'currency', currency: selectedCurrency, notation: 'compact', maximumFractionDigits: 1
    }).format(Number(amount));
    window.getTechCertCurrency = () => selectedCurrency;
    document.addEventListener('DOMContentLoaded', () => {
        initSelectors();
        loadLatestRates();
    });
})();
