import React, { useState, useEffect } from "react";
import defaultAvatar from "./avatar1.jpg";

const Avatar = React.memo(({ image, size = 48, name, style }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [image]);

  const cleanImage = typeof image === "string" ? image.trim() : image;
  const showImage = Boolean(cleanImage) && !hasError;

  return (
    <div
      className="rounded-full overflow-hidden border-2 border-white shadow-md flex items-center justify-center bg-[#5C0EA4] text-white font-bold select-none"
      style={{ width: size, height: size, ...style }}
      title={name}
    >
      {showImage ? (
        <img
          src={cleanImage}
          alt={name || "Avatar"}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : name && name !== "User" && name !== "Anonymous" ? (
        <span style={{ fontSize: Math.max(14, Math.floor(size * 0.38)) }}>
          {name.charAt(0).toUpperCase()}
        </span>
      ) : (
        <img
          src={defaultAvatar}
          alt="Avatar"
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
});

export default Avatar;
