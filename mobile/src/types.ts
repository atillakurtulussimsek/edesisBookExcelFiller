export type Header = { kitapAdi: string; isbn: string; yayinevi: string; kitapId: string };

export type SessionSummary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourceFileName: string;
  header: Header;
  testCount: number;
  jobCount?: number;
  readyCount?: number;
};

export type Test = {
  konuKodu: number;
  konuAdiUks: string;
  konuAdiKitap: string;
  testId: number | '';
  soruSayisi: number;
  testTuru: string;
  cevaplar: string;
  otomatik?: boolean;
  puan?: number;
};

export type Job = {
  id: string;
  order: number;
  status: 'queued' | 'analyzing' | 'ready' | 'error';
  pageCount: number;
  tests: AnalyzedTest[];
  error: string;
  otoRed?: string;
  createdAt: string;
};

export type Session = {
  id: string;
  sourceFileName: string;
  header: Header;
  tests: Test[];
  jobs?: Job[];
};

export type Konu = { sinif: string; ders: string; kod: number; ad: string };
export type TestTuru = { ad: string; id: number | null };

export type SessionDetail = { session: Session; konular: Konu[]; testTurleri: TestTuru[] };

export type AnalyzedTest = {
  testNo: number | '';
  konuAdi: string;
  cevaplar: string;
  not: string;
  testTuru?: string;
  testTuruOneri?: string;
  guven?: number;
  puan?: number;
  konuSkor?: number;
  nedenler?: string[];
  konuOnerileri: Konu[];
};

export type TestPayload = {
  konuKodu: number | '';
  konuAdiKitap: string;
  testId: number | '';
  soruSayisi: number;
  testTuru: string;
  cevaplar: string;
};
