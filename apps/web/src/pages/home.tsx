import { Spacer } from "@awlt/design";

import TrackGrid from "@/components/tracks/track-grid";
import useCurrentUser from "@/hooks/useCurrentUser";
import useUserTopTracks from "@/hooks/useuserTopTracks";

const HomePage = () => {
  const { data, isLoading } = useUserTopTracks();
  const { user } = useCurrentUser();

  return (
    <>
      <h1 className="mt-8 text-3xl font-bold text-(--gray-12)">
        Welcome back{`${user !== undefined ? `, ${user.username}` : ""}`}
      </h1>

      {!isLoading && data !== undefined && (
        <>
          <Spacer size="8" />
          <h2 className="text-xl font-semibold text-(--gray-12)">Your top tracks</h2>
          <Spacer size="2" />
          <div className="col-[breakout]!">
            <TrackGrid tracks={data} />
          </div>
        </>
      )}

      <Spacer size="8" />

      <p className="mt-2 max-w-[500px] text-(--gray-11)">
        There should probably be something here but it hasn't been implemented yet. Meanwhile, search something with the
        search bar at top!
      </p>
    </>
  );
};

export default HomePage;
