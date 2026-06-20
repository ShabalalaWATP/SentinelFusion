import { ExternalLink, Search } from "lucide-react";
import type { Aircraft, AircraftIntelResponse } from "@aisstream/shared";
import { useAircraftIntelStore } from "../../stores/aircraftIntelStore";

type AircraftIntelPanelProps = {
  aircraft: Aircraft;
};

export function AircraftIntelPanel({ aircraft }: AircraftIntelPanelProps) {
  const status = useAircraftIntelStore((state) => state.statuses[aircraft.id] ?? "idle");
  const result = useAircraftIntelStore((state) => state.results[aircraft.id] ?? null);
  const error = useAircraftIntelStore((state) => state.errors[aircraft.id] ?? null);
  const research = useAircraftIntelStore((state) => state.research);
  const isLoading = status === "loading";
  const currentError = status === "error" ? error : null;

  return (
    <section className="rounded-md border border-slate-500/[0.16] bg-slate-950/[0.28] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-normal text-slate-400">
            Web intel
          </p>
          <p className="mt-1 truncate text-sm font-medium text-slate-100">
            {result ? result.model ?? result.mode : "Public aircraft search"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void research(aircraft.id)}
          disabled={isLoading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-cyan-300/[0.35] bg-cyan-300/[0.12] px-3 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/[0.18] disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800 disabled:text-slate-500"
        >
          <Search size={15} aria-hidden="true" />
          {isLoading ? "Searching" : result ? "Refresh" : "Research"}
        </button>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm leading-5 text-slate-400">Searching public sources...</p>
      ) : null}

      {currentError ? (
        <p className="mt-3 text-sm leading-5 text-red-200">{currentError}</p>
      ) : null}

      {result ? <AircraftIntelResult result={result} aircraft={aircraft} /> : null}

      {!result && !isLoading && !currentError ? (
        <p className="mt-3 text-sm leading-5 text-slate-400">
          No web intel loaded for this aircraft yet.
        </p>
      ) : null}
    </section>
  );
}

function AircraftIntelResult({
  aircraft,
  result
}: {
  aircraft: Aircraft;
  result: AircraftIntelResponse;
}) {
  const primaryImageHref = safePublicUrl(result.image?.sourceUrl) ?? safePublicUrl(result.image?.imageUrl);
  const primaryImageSrc = safePublicUrl(result.image?.thumbnailUrl) ?? safePublicUrl(result.image?.imageUrl);

  return (
    <div className="mt-4 space-y-3 text-sm leading-5 text-slate-300">
      {result.image && primaryImageHref && primaryImageSrc ? (
        <a
          href={primaryImageHref}
          target="_blank"
          rel="noreferrer"
          className="group block overflow-hidden rounded-md border border-slate-500/[0.16] bg-slate-900"
        >
          <img
            src={primaryImageSrc}
            alt={result.image.caption ?? `${aircraftLabel(aircraft)} aircraft reference`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-28 w-full object-cover transition group-hover:scale-[1.02]"
          />
        </a>
      ) : null}

      {result.profile ? <ProfileGrid result={result} /> : null}
      <p className="font-medium text-slate-100">{result.summary}</p>
      {result.images && result.images.length > 1 ? (
        <ImageGallery images={result.images} aircraft={aircraft} />
      ) : null}
      <IntelList title="Facts" items={result.facts} />
      <SourceList sources={result.sources} />
      <IntelList title="Limitations" items={result.limitations} />
    </div>
  );
}

function ProfileGrid({ result }: { result: AircraftIntelResponse }) {
  const profile = result.profile;
  if (!profile) {
    return null;
  }

  const items = [
    ["Callsign", profile.matchedCallsign],
    ["ICAO", profile.icao24?.toUpperCase()],
    ["Reg", profile.registration],
    ["Type", profile.aircraftType ?? profile.model],
    ["Class", profile.classification],
    ["Operator", profile.operator ?? profile.owner],
    ["Maker", profile.manufacturer],
    ["Confidence", profile.confidence]
  ].filter((item): item is [string, string] => typeof item[1] === "string" && item[1].length > 0);

  if (items.length === 0) {
    return null;
  }

  return (
    <dl className="grid grid-cols-2 gap-2">
      {items.slice(0, 8).map(([label, value]) => (
        <div key={label} className="rounded-md bg-slate-900/[0.68] px-2.5 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-normal text-slate-500">
            {label}
          </dt>
          <dd className="mt-0.5 truncate text-xs font-medium text-slate-100">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ImageGallery({
  aircraft,
  images
}: {
  aircraft: Aircraft;
  images: NonNullable<AircraftIntelResponse["images"]>;
}) {
  const safeImages = images
    .slice(1, 4)
    .map((image) => ({
      image,
      href: safePublicUrl(image.sourceUrl) ?? safePublicUrl(image.imageUrl),
      src: safePublicUrl(image.thumbnailUrl) ?? safePublicUrl(image.imageUrl)
    }))
    .filter((item): item is { image: typeof item.image; href: string; src: string } =>
      Boolean(item.href && item.src)
    );

  return (
    <div className="grid grid-cols-3 gap-2">
      {safeImages.map(({ href, image, src }) => (
        <a
          key={image.imageUrl}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-md border border-slate-500/[0.16] bg-slate-900"
        >
          <img
            src={src}
            alt={image.caption ?? `${aircraftLabel(aircraft)} aircraft reference`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-16 w-full object-cover"
          />
        </a>
      ))}
    </div>
  );
}

function IntelList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
        {title}
      </p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-slate-300">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceList({ sources }: { sources: AircraftIntelResponse["sources"] }) {
  const safeSources = sources
    .map((source) => ({ ...source, url: safePublicUrl(source.url) }))
    .filter((source): source is { title: string; url: string } => Boolean(source.url));

  if (safeSources.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
        Sources
      </p>
      <ul className="mt-1 space-y-1">
        {safeSources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-cyan-100 underline-offset-2 hover:underline"
            >
              <span className="truncate">{source.title}</span>
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function aircraftLabel(aircraft: Aircraft): string {
  return aircraft.callsign ?? aircraft.registration ?? aircraft.icao24.toUpperCase();
}

function safePublicUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}
