/**
 * 
 */

// imports

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  i18n: {
    defaultLocale: 'en-US',
    locales: [
      'en-US', 'sp'
    ]
  },
  typescript: {
    tsconfigPath: './tsconfig.json'
  }
}

  export default nextConfig