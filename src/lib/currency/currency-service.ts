/**
 * Multi-Currency Support Service
 * Handles currency conversion, formatting, and exchange rate management
 */

export interface Currency {
  code: string
  name: string
  symbol: string
  decimals: number
  isBase?: boolean
}

export interface ExchangeRate {
  from: string
  to: string
  rate: number
  updatedAt: Date
}

// Supported currencies
export const CURRENCIES: Record<string, Currency> = {
  KWD: { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', decimals: 3, isBase: true },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2 },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', decimals: 2 },
  QAR: { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', decimals: 2 },
  BHD: { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', decimals: 3 },
  OMR: { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع', decimals: 3 },
  EGP: { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', decimals: 2 },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
}

// Default exchange rates (KWD as base)
// These should be updated from an API in production
const DEFAULT_RATES: Record<string, number> = {
  KWD: 1,
  USD: 3.26,
  EUR: 3.53,
  GBP: 4.12,
  AED: 0.888,
  SAR: 0.869,
  QAR: 0.896,
  BHD: 8.66,
  OMR: 8.47,
  EGP: 0.066,
  INR: 0.039,
  CNY: 0.448,
  JPY: 0.0217,
}

class CurrencyService {
  private static instance: CurrencyService
  private rates: Map<string, number> = new Map()
  private lastUpdate: Date | null = null

  private constructor() {
    this.initializeRates()
  }

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService()
    }
    return CurrencyService.instance
  }

  private initializeRates(): void {
    Object.entries(DEFAULT_RATES).forEach(([code, rate]) => {
      this.rates.set(code, rate)
    })
    this.lastUpdate = new Date()
  }

  /**
   * Get all supported currencies
   */
  getCurrencies(): Currency[] {
    return Object.values(CURRENCIES)
  }

  /**
   * Get a specific currency by code
   */
  getCurrency(code: string): Currency | undefined {
    return CURRENCIES[code.toUpperCase()]
  }

  /**
   * Get current exchange rate from base currency (KWD)
   */
  getRate(currencyCode: string): number {
    return this.rates.get(currencyCode.toUpperCase()) || 1
  }

  /**
   * Convert amount between currencies
   */
  convert(amount: number, fromCurrency: string, toCurrency: string): number {
    const from = fromCurrency.toUpperCase()
    const to = toCurrency.toUpperCase()

    if (from === to) return amount

    const fromRate = this.getRate(from)
    const toRate = this.getRate(to)

    // Convert to base (KWD) then to target
    const inBase = amount / fromRate
    const result = inBase * toRate

    return this.round(result, CURRENCIES[to]?.decimals || 2)
  }

  /**
   * Format amount with currency symbol
   */
  format(amount: number, currencyCode: string, options?: Intl.NumberFormatOptions): string {
    const currency = this.getCurrency(currencyCode)
    if (!currency) {
      return amount.toFixed(2)
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
      ...options,
    })

    return formatter.format(amount)
  }

  /**
   * Format amount with custom symbol (for display)
   */
  formatWithSymbol(amount: number, currencyCode: string): string {
    const currency = this.getCurrency(currencyCode)
    if (!currency) {
      return `${amount.toFixed(2)}`
    }

    const formatted = this.round(amount, currency.decimals).toLocaleString('en-US', {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    })

    return `${currency.symbol} ${formatted}`
  }

  /**
   * Parse currency string to number
   */
  parse(value: string, currencyCode?: string): number {
    // Remove currency symbols and formatting
    const cleaned = value.replace(/[^0-9.-]/g, '')
    const parsed = parseFloat(cleaned)

    if (isNaN(parsed)) return 0

    const decimals = currencyCode ? (CURRENCIES[currencyCode]?.decimals || 2) : 2
    return this.round(parsed, decimals)
  }

  /**
   * Round to specific decimal places
   */
  private round(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals)
    return Math.round(value * factor) / factor
  }

  /**
   * Update exchange rates (call from API)
   */
  updateRates(rates: Record<string, number>): void {
    Object.entries(rates).forEach(([code, rate]) => {
      if (CURRENCIES[code]) {
        this.rates.set(code, rate)
      }
    })
    this.lastUpdate = new Date()
  }

  /**
   * Get all current rates
   */
  getAllRates(): ExchangeRate[] {
    const rates: ExchangeRate[] = []
    this.rates.forEach((rate, code) => {
      if (code !== 'KWD') {
        rates.push({
          from: 'KWD',
          to: code,
          rate,
          updatedAt: this.lastUpdate || new Date(),
        })
      }
    })
    return rates
  }

  /**
   * Get last update timestamp
   */
  getLastUpdate(): Date | null {
    return this.lastUpdate
  }
}

export const currencyService = CurrencyService.getInstance()

// Convenience functions for direct use
export function formatCurrency(amount: number, currency = 'KWD'): string {
  return currencyService.formatWithSymbol(amount, currency)
}

export function convertCurrency(amount: number, from: string, to: string): number {
  return currencyService.convert(amount, from, to)
}

export function parseCurrency(value: string, currency?: string): number {
  return currencyService.parse(value, currency)
}
