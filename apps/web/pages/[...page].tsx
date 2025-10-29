import Head from 'next/head';
import type {
  GetStaticPaths,
  GetStaticProps,
  GetStaticPropsContext,
  GetStaticPropsResult,
} from 'next';
import { Builder, BuilderComponent as BuilderComponentBase } from '@builder.io/react';
import type { BuilderContent } from '@builder.io/sdk';
import { getAllVibeAnyPaths, getVibeAnyContent } from '@/lib/vibeany/getContent';
import { augmentWithVibeAny } from '@/lib/vibeany/augmentWithVibeAny';
import '@/lib/vibeany/register';
import type { ComponentType } from 'react';

const BuilderComponent = BuilderComponentBase as unknown as ComponentType<any>;

export type LandingPageProps = {
  vibeAnyPage: BuilderContent | null;
  urlPath: string;
  isVibeAnyRoute?: boolean;
};

const DEFAULT_TITLE = 'VibeAny – Build Anything with AI';
const DEFAULT_DESCRIPTION = 'VibeAny homepage powered by VibeAny';

function formatTitle(page: BuilderContent | null): string {
  const pageTitle =
    (page?.data as any)?.pageTitle || (page?.data as any)?.title || DEFAULT_TITLE;
  return pageTitle;
}

function formatDescription(page: BuilderContent | null): string {
  return (
    (page?.data as any)?.pageDescription ||
    (page?.data as any)?.description ||
    DEFAULT_DESCRIPTION
  );
}

function normalizePathFromContext(context: GetStaticPropsContext): string {
  const slug = context.params?.page;
  if (!slug) {
    return '/';
  }
  if (Array.isArray(slug)) {
    const joined = slug.filter(Boolean).join('/');
    return `/${joined}`;
  }
  return `/${slug}`;
}

function NotFoundFallback() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 bg-white/80 py-24 text-center text-slate-700">
      <h1 className="text-4xl font-semibold text-slate-900">404</h1>
      <p className="max-w-md text-base">
        Sorry, we couldn’t find that page. Try heading back to the homepage.
      </p>
    </div>
  );
}

export default function LandingPage({ vibeAnyPage }: LandingPageProps) {
  const title = formatTitle(vibeAnyPage);
  const description = formatDescription(vibeAnyPage);
  const canRender = Boolean(vibeAnyPage) || Builder.isEditing || Builder.isPreviewing;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
      </Head>
      {canRender ? (
        <BuilderComponent model="content-page" content={vibeAnyPage ?? undefined} />
      ) : (
        <NotFoundFallback />
      )}
    </>
  );
}

async function buildVibeAnyContent(
  urlPath: string,
  options?: { augmentWithVibeAny?: boolean },
): Promise<GetStaticPropsResult<LandingPageProps>> {
  const content = (await getVibeAnyContent(urlPath)) as BuilderContent | null;

  if (!content) {
    return {
      notFound: true,
      revalidate: 30,
    };
  }

  const augmented = options?.augmentWithVibeAny
    ? augmentWithVibeAny(content)
    : content;

  return {
    props: {
      vibeAnyPage: augmented,
      urlPath,
      isVibeAnyRoute: true,
    },
    revalidate: 120,
  };
}

export const getStaticPaths: GetStaticPaths = async () => {
  const allPaths = await getAllVibeAnyPaths();
  const paths = allPaths
    .filter((path) => path && path !== '/')
    .map((path) => ({
      params: {
        page: path
          .replace(/^\/+/, '')
          .split('/')
          .filter(Boolean),
      },
    }));

  return {
    paths,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<LandingPageProps> = async (context) => {
  const urlPath = normalizePathFromContext(context);
  return buildVibeAnyContent(urlPath, { augmentWithVibeAny: urlPath === '/' });
};

export function buildLandingPageStaticProps(
  urlPath: string,
  options?: { augmentWithVibeAny?: boolean },
): Promise<GetStaticPropsResult<LandingPageProps>> {
  return buildVibeAnyContent(urlPath, options);
}
