import { Item } from "../ItemCard";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";

export const VideoCard = ({ item }: { item: Item }) => {
  const videoUrl = useResolvedMediaUrl(item.imageUrl);

  return (
    <div className="mt-2 max-w-md">
      <video
        controls
        src={videoUrl}
        className="rounded-lg object-cover bg-black"
        style={{ maxHeight: "300px", maxWidth: "100%" }}
      />
    </div>
  );
};
