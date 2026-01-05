import * as React from "react"

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number
}

export function Logo({ size = 24, className, ...props }: LogoProps) {
  return (
    <img
      src="/M.svg"
      alt="Logo"
      width={size}
      height={size}
      className={className}
      {...props}
    />
  )
}
