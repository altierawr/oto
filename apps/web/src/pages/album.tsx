import { Button, Spacer } from "@awlt/design";
import clsx from "clsx";
import { Play } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link, useLoaderData, type LoaderFunction } from "react-router";
import { Fragment } from "react/jsx-runtime";

import type { Album } from "../types";

import CoverBlock, { CoverBlockVariant } from "../components/music-blocks/cover-block";
import SongList from "../components/song-list";
import { usePlayerState } from "../store";
import { request } from "../utils/http";
import { getTidalCoverUrl } from "../utils/image";
import { formatDuration } from "../utils/utils";

const loader: LoaderFunction = async ({ params }) => {
  const data = await request(`/albums/${params.id}`);
  const json: Album = await data.json();

  return { album: json };
};

const AlbumPage = () => {
  const data = useLoaderData() as { album: Album };
  const player = usePlayerState((s) => s.player);

  const handlePlayClick = async () => {
    if (data.album.songs) {
      player.playSongs(data.album.songs, 0);
    }
  };

  const songsByVolume = data.album.songs ? Object.groupBy(data.album.songs, (s) => s.volumeNumber) : undefined;
  const songsByVolumeKeys = songsByVolume ? Object.keys(songsByVolume) : undefined;

  return (
    <>
      <Helmet>
        <title>
          {data.album.title} / {data.album.artists?.[0].name} - oto
        </title>
      </Helmet>
      <div className="max-w-[900px]">
        <div className="flex gap-4">
          <div className="aspect-square min-w-[200px]">
            <CoverBlock
              variant={CoverBlockVariant.COVER_ONLY}
              imageUrl={data.album.cover ? getTidalCoverUrl(data.album.cover, 1280) : ""}
            />
          </div>

          <div className="flex flex-col items-start justify-between">
            <div>
              <h1
                className={clsx(
                  "font-bold",
                  "tracking-tight",
                  data.album.title.length <= 45 && "text-5xl",
                  data.album.title.length > 45 && "text-4xl",
                  "line-clamp-2",
                )}
              >
                {data.album.title}
              </h1>
              <p className="text-sm">
                Album by{" "}
                {data.album.artists?.[0] && (
                  <Link to={`/artists/${data.album.artists[0].id}`} className="text-(--blue-11)">
                    {data.album.artists[0].name}
                  </Link>
                )}
              </p>
              <p className="text-sm">
                {data.album.releaseDate?.slice(0, 4)} • {data.album.numberOfTracks} songs •{" "}
                {formatDuration(data.album.duration || 0, "written")}
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="solid" color="blue" onClick={handlePlayClick}>
                <Play size={16} fill="currentColor" />
                Play Album
              </Button>
              {/*<IconButton color="gray" variant="soft" icon={Heart} />
              <IconButton color="gray" variant="soft" icon={Share} />*/}
            </div>
          </div>
        </div>
        <div className="mt-4"></div>
        {songsByVolumeKeys?.map((key) => (
          <Fragment key={key}>
            {songsByVolumeKeys.length > 1 && <h2 className="mb-2 text-lg font-bold">Volume {key}</h2>}
            <SongList songs={songsByVolume![parseInt(key)]!} />
            <Spacer size="8" />
          </Fragment>
        ))}
      </div>
    </>
  );
};

export { loader };
export default AlbumPage;
