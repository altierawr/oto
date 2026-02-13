import MusicControlsDesktop from "./desktop";
import MusicControlsMobile from "./mobile";

const MusicControls = () => {
  return (
    <div className="sticky bottom-0 z-50 col-[breakout]! flex items-center justify-center p-3">
      <div className="flex w-full justify-between rounded-3xl border-t border-t-(--gray-4) bg-[color-mix(in_srgb,var(--gray-2)_80%,transparent)] px-6 py-4 shadow-2xl backdrop-blur-lg lg:h-[90px]">
        <MusicControlsDesktop className="max-sm:hidden" />
        <MusicControlsMobile className="sm:hidden" />
      </div>
    </div>
  );
};

export default MusicControls;
