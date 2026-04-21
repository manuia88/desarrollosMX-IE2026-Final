import type { ReactNode } from 'react';
import { PreviewNav } from '@/features/preview-ux/components/PreviewNav';

type Props = {
  children: ReactNode;
};

export default function PreviewLayout({ children }: Props) {
  return (
    <>
      <PreviewNav />
      {children}
    </>
  );
}
