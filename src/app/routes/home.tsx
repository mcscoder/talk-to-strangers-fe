import { Button } from "antd";
import { Link } from "src/components/ui/link";

export const HomeRoute = () => {
  return (
    <div className="flex items-center justify-center h-full flex-1">
      <Link to={"/chat"}>
        <Button
          color="primary"
          variant="solid"
          size="large"
        >
          Start video chatting
        </Button>
      </Link>
    </div>
  );
};
