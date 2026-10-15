// AvatarLayer.jsx
import Avatar from "../map/map assets/avtar";
const AvatarLayer = ({ members, localPlayerId, localPosition, avatarSize }) => (
  <>
    {members.map((member) => {
      const isLocal = member.userId === localPlayerId;
      const renderX = isLocal ? localPosition.x : member.x;
      const renderY = isLocal ? localPosition.y : member.y;

      return (
        <Avatar
          key={member.userId}
          image={member.avatar || member.avatarUrl}
          size={avatarSize}
          name={member.username}
          style={{
            position: "absolute",
            top: `${renderY}%`,
            left: `${renderX}%`,
            transform: "translate(-50%, -50%)",
            willChange: "top, left, transform",
            transition: "top 0.1s linear, left 0.1s linear"
          }}
        />
      );
    })}
  </>
);

export default AvatarLayer;