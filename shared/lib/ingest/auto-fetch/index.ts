export type {
  AutoFetchConfig,
  AutoFetchResult,
  AutoFetchState,
  DiscoveryResult,
  RunAutoFetchOptions,
  StorageUploader,
} from './auto-fetcher';
export {
  bumpAutoFetchState,
  getAutoFetchState,
  runAutoFetch,
} from './auto-fetcher';
export type { AutoFetchSource } from './sources';
export {
  AUTOFETCH_CONFIGS,
  AUTOFETCH_SOURCES,
  BBVA_RESEARCH_CONFIG,
  CNBV_CONFIG,
  FOVISSSTE_CONFIG,
  INFONAVIT_CONFIG,
  isAutoFetchSource,
  regexDiscoverer,
  SHF_CONFIG,
} from './sources';
