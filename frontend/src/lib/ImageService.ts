export const ImageService = {
  getPoster(path: string | null | undefined, size: 'w500' | 'w780' | 'original' = 'w500', title?: string): string {
    if (!path) {
      return this.FallbackImage('poster', title);
    }
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `https://image.tmdb.org/t/p/${size}${cleanPath}`;
  },

  getBackdrop(path: string | null | undefined, size: 'original' | 'w780' | 'w1280' = 'w1280', title?: string): string {
    if (!path) {
      return this.FallbackImage('backdrop', title);
    }
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `https://image.tmdb.org/t/p/${size}${cleanPath}`;
  },

  getProfile(path: string | null | undefined, title?: string): string {
    if (!path) {
      return this.FallbackImage('profile', title);
    }
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `https://image.tmdb.org/t/p/w185${cleanPath}`;
  },

  getThumbnail(path: string | null | undefined, title?: string): string {
    if (!path) {
      return this.FallbackImage('poster', title);
    }
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `https://image.tmdb.org/t/p/w342${cleanPath}`;
  },

  FallbackImage(type: 'poster' | 'backdrop' | 'profile', title?: string): string {
    const displayTitle = title || 'NEXUS PLAY';
    const width = type === 'poster' ? 500 : (type === 'backdrop' ? 1920 : 300);
    const height = type === 'poster' ? 750 : (type === 'backdrop' ? 1080 : 300);
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0a0a0b"/>
            <stop offset="100%" stop-color="#030303"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Outfit, Inter, sans-serif" font-size="${type === 'poster' ? 22 : 42}" font-weight="bold" fill="rgba(255,255,255,0.08)" letter-spacing="2">
          ${displayTitle.toUpperCase()}
        </text>
        <text x="50%" y="${type === 'poster' ? '58%' : '56%'}" dominant-baseline="middle" text-anchor="middle" font-family="Inter, sans-serif" font-size="${type === 'poster' ? 10 : 13}" font-weight="bold" fill="#00c896" opacity="0.25" letter-spacing="4">
          ${type.toUpperCase()} PREVIEW
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
  },

  // Base64 miniature blur-hash representation to avoid Next.js layout shifts during loading
  getBlurHash(): string {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
};
