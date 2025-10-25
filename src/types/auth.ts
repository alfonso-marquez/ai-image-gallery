import { ReactNode } from "react";

export interface AccountLayoutProps {
  heading: string;
  logo?: {
    url: string;
    src: string;
    alt: string;
    title?: string;
  };
  children: ReactNode;
  footerText?: string;
  footerLinkText?: string;
  footerLinkUrl?: string;
}
