import React from 'react';
import { useRouter } from 'expo-router';
import { HomeCamera } from '../components/home/HomeCamera';

export default function CameraScreen() {
  const router = useRouter();
  return <HomeCamera onClose={() => router.back()} />;
}
