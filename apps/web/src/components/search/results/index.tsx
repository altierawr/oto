import { useNavigate } from "react-router";

type TProps = {
  imageUrl: string;
  primaryText: string | React.ReactNode;
  secondaryText: string | React.ReactNode;
  linkUrl: string;
  onClose?: () => void;
};

const SearchResult = ({
  imageUrl,
  primaryText,
  secondaryText,
  linkUrl,
  onClose,
}: TProps) => {
  const navigate = useNavigate();

  const sendToUrl = () => {
    onClose?.();
    navigate(linkUrl);
  };

  return (
    <div
      className="w-full flex gap-3 h-11 min-h-11 rounded-md p-1 transition-colors hover:bg-(--gray-2) active:bg-(--gray-3)"
      onDoubleClick={sendToUrl}
    >
      <div
        className="h-full aspect-square bg-cover rounded-lg hover:outline-1 hover:outline-(--blue-8) cursor-pointer"
        style={{
          backgroundImage: `url(${imageUrl})`,
        }}
        onClick={sendToUrl}
      />

      <div className="flex flex-col justify-center flex-1">
        <p className="font-semibold text-sm line-clamp-1">{primaryText}</p>
        <p className="text-xs text-(--gray-11) line-clamp-1">{secondaryText}</p>
      </div>
    </div>
  );
};

export default SearchResult;
