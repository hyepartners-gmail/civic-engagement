'use client';

import React, { useState, useEffect } from 'react';
import { colors } from '@/lib/theme';

interface QRCanvasProps {
  value: string;
  size?: number;
}

export default function QRCanvas({ value, size = 128 }: QRCanvasProps) {
  const [QRCodeCanvas, setQRCodeCanvas] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import the QRCodeCanvas component only on the client
    import('qrcode.react').then((module) => {
      setQRCodeCanvas(() => module.QRCodeCanvas);
    });
  }, []);

  if (!isClient || !QRCodeCanvas) {
    return <div className="w-[136px] h-[136px] bg-platform-contrast rounded-lg animate-pulse" />;
  }

  return (
    <div className="p-2 bg-white inline-block rounded-lg">
      <QRCodeCanvas
        value={value}
        size={size}
        bgColor={"#ffffff"}
        fgColor={colors.platform.background}
        level={"L"}
        includeMargin={false}
      />
    </div>
  );
}