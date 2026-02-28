import { Item } from "../ItemCard";
import { getImageUrl } from "@/lib/media";

export const VideoCard = ({ item }: { item: Item }) => {
  return (
    <div className="mt-2 max-w-md">
      <video
        controls
        src={getImageUrl(item.imageUrl!)}
        className="rounded-lg object-cover bg-black"
        style={{ maxHeight: "300px", maxWidth: "100%" }}
      />
    </div>
  );
};
