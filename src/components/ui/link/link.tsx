import { Typography } from "antd";
import { LinkProps, Link as ReactLink } from "react-router-dom";

export const Link = ({ children, ...props }: LinkProps) => {
  return (
    <ReactLink {...props}>
      <Typography.Link>{children}</Typography.Link>
    </ReactLink>
  );
};
