import "./index.css";
import { Composition } from "remotion";
import { Showcase } from "./Showcase";
export const RemotionRoot = () => (
  <Composition
    id="AlderShowcase"
    component={Showcase}
    durationInFrames={2700}
    fps={30}
    width={1920}
    height={1080}
  />
);
