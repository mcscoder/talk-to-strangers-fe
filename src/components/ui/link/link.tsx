import { LinkProps, Link as ReactLink } from "react-router-dom";
import { cn } from "src/utils";

export const Link = ({ children, className, ...props }: LinkProps) => {
  return (
    <ReactLink
      className={cn(
        className,
        "font-medium text-blue-600 dark:text-blue-500 hover:underline"
      )}
      {...props}
    >
      {children}
    </ReactLink>
  );
};
