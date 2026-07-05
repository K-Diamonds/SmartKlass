type YouTubeEmbedProps = {
  videoId: string;
  title: string;
  embedUrl?: string;
  className?: string;
};

export function YouTubeEmbed({
  videoId,
  title,
  embedUrl,
  className = '',
}: YouTubeEmbedProps) {
  const src =
    embedUrl ?? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-xl bg-black ${className}`}
    >
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
