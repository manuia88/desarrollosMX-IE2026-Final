// F14.F.6 Sprint 5 BIBLIA Tarea 5.5 — SRT generator desde Deepgram transcription.

interface TranscriptionInput {
  utterances?: Array<{
    start: number;
    end: number;
    transcript: string;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    punctuated_word?: string;
  }>;
  transcript?: string;
}

export function generateSrt(transcription: unknown): string {
  const data = transcription as TranscriptionInput;
  const utterances = data.utterances ?? [];
  if (utterances.length === 0) {
    if (data.transcript) {
      return `1\n${formatTimecode(0)} --> ${formatTimecode(5)}\n${data.transcript}\n`;
    }
    return '';
  }
  return utterances
    .map((u, idx) => {
      const start = formatTimecode(u.start);
      const end = formatTimecode(u.end);
      return `${idx + 1}\n${start} --> ${end}\n${u.transcript.trim()}\n`;
    })
    .join('\n');
}

export function formatTimecode(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)},${pad3(ms)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}
