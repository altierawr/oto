import clsx from "clsx";

import CoverBlock, { CoverBlockVariant } from "@/components/music-blocks/cover-block";
import { getTidalCoverUrl } from "@/utils/image";

import type { Album } from "../../../types";

import HorizontalMediaScroller from "../../horizonal-media-scroller";
import AlbumsScrollerItem from "./item";

type TProps = {
  id: string;
  recommendedFromAlbum: Album;
  albums: Album[];
};

const RecommendedAlbumScroller = ({ id, recommendedFromAlbum, albums }: TProps) => {
  return (
    <>
      <HorizontalMediaScroller
        id={id}
        title={
          <div className="flex gap-2">
            {recommendedFromAlbum.cover && (
              <div className="aspect-square h-[48px]">
                <CoverBlock
                  variant={CoverBlockVariant.COVER_ONLY}
                  imageUrls={[getTidalCoverUrl(recommendedFromAlbum.cover, 320)]}
                />
              </div>
            )}
            <div>
              <p className="text-sm text-(--gray-11)">Because you listened to</p>
              <p className="line-clamp-1 text-lg font-semibold">{recommendedFromAlbum.title}</p>
            </div>
          </div>
        }
        titleContentGap="4"
        className={clsx("col-[breakout]! scroll-px-(--content-side-padding) px-(--content-side-padding)")}
      >
        {albums.map((album) => (
          <AlbumsScrollerItem key={album.id} album={album} showArtists={true} />
        ))}
      </HorizontalMediaScroller>
    </>
  );
};

export default RecommendedAlbumScroller;
