import { describe, expect, it } from 'vitest';
import {
  AIRROI_ALERT_THRESHOLD_PCT,
  AIRROI_BASE_URL,
  AIRROI_ENDPOINTS,
  AIRROI_HARD_LIMIT_PCT,
  AIRROI_MCP_URL,
  AIRROI_MONTHLY_BUDGET_USD,
  AIRROI_SEARCH_MAX_PAGE_SIZE,
  estimateBulkRestCostUsd,
  recommendBulkStrategy,
} from '../airroi-pricing';

describe('AirROI pricing table (U3 validation)', () => {
  it('exposes stable base URLs for REST + MCP', () => {
    expect(AIRROI_BASE_URL).toBe('https://api.airroi.com');
    expect(AIRROI_MCP_URL).toBe('https://mcp.airroi.com');
  });

  it('caps monthly budget at ADR-019 value', () => {
    expect(AIRROI_MONTHLY_BUDGET_USD).toBe(500);
    expect(AIRROI_ALERT_THRESHOLD_PCT).toBe(80);
    expect(AIRROI_HARD_LIMIT_PCT).toBe(100);
  });

  it('records validated endpoints with empirical cost', () => {
    const search = AIRROI_ENDPOINTS.markets_search;
    expect(search.validation_status).toBe('validated_empirical');
    expect(search.estimated_cost_usd).toBe(0.1);

    const listingsMarket = AIRROI_ENDPOINTS.listings_search_market;
    expect(listingsMarket.validation_status).toBe('validated_empirical');
    expect(listingsMarket.estimated_cost_usd).toBe(0.5);
  });

  it('captures the 10-listing page cap observed on listings/search/market', () => {
    expect(AIRROI_SEARCH_MAX_PAGE_SIZE).toBe(10);
  });

  it('estimates REST bulk cost as ceil(total/page_size) × per-call', () => {
    expect(estimateBulkRestCostUsd(10)).toBe(0.5);
    expect(estimateBulkRestCostUsd(11)).toBe(1);
    expect(estimateBulkRestCostUsd(1051)).toBe(106 * 0.5);
  });

  it('recommends MCP once REST bulk cost crosses 2× MCP cost', () => {
    expect(recommendBulkStrategy(10)).toBe('rest');
    expect(recommendBulkStrategy(1051)).toBe('mcp');
    expect(recommendBulkStrategy(23_706)).toBe('mcp');
  });
});
