import { useState, useCallback } from "react";
import * as session from "../session.js";

export default function useSession() {
  const [token, _setToken] = useState(session.getToken);
  const [name, _setName] = useState(session.getName);
  const [avatar, _setAvatar] = useState(session.getAvatar);

  const setIdentity = useCallback((tok, n, av) => {
    session.setToken(tok);
    session.setName(n);
    session.setAvatar(av);
    _setToken(tok);
    _setName(n);
    _setAvatar(av);
  }, []);

  return {
    token,
    name,
    avatar,
    hasIdentity: !!(token && name && avatar),
    setIdentity,
  };
}
