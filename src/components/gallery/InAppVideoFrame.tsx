import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { triggerHaptic } from "../../utils/haptics";

interface InAppVideoFrameProps {
  sourceUrl: string;
  posterUrl?: string;
  aspectRatio?: number;
  height: number;
}

/**
 * Clean in-app video frame designed with Pinterest & Snapchat aesthetics.
 * Features seamless looping, tap-to-pause, and floating audio controls.
 */
export function InAppVideoFrame({
  sourceUrl,
  height,
}: InAppVideoFrameProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const player = useVideoPlayer(sourceUrl, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  const togglePlay = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    // eslint-disable-next-line react-hooks/immutability
    player.muted = !player.muted;
    setIsMuted(player.muted);
  };

  return (
    <View className="relative w-full overflow-hidden rounded-3xl bg-black" style={{ height }}>
      {/* Native Video Surface */}
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Tap anywhere to Toggle Play/Pause */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={togglePlay}
        className="absolute inset-0 items-center justify-center"
      >
        {!isPlaying && (
          <View className="w-16 h-16 rounded-full bg-black/60 items-center justify-center border border-white/20">
            <Ionicons name="play" size={30} color="#FFFFFF" style={{ marginLeft: 3 }} />
          </View>
        )}
      </TouchableOpacity>

      {/* Floating Audio Toggle (Top Right) */}
      <View className="absolute top-3 right-3 flex-row items-center pointer-events-box-none">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggleMute}
          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md items-center justify-center border border-white/10"
        >
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* Video Indicator Badge (Bottom Left) */}
      <View className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full flex-row items-center gap-1.5 border border-white/10">
        <View className="w-2 h-2 rounded-full bg-[#E60023]" />
        <Text className="text-[11px] font-outfit-semibold text-white tracking-wider">
          VIDEO
        </Text>
      </View>
    </View>
  );
}
