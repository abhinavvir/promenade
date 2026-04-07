#!/bin/bash
set -e

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}  Promenade — App Startup${NC}"
echo "  ─────────────────────────"
echo ""

# ─── Check web .env ──────────────────────────────────────────────────────────
HAS_LOCAL_DB=false
if grep -q "DATABASE_URL=postgresql" web/.env 2>/dev/null; then
  HAS_LOCAL_DB=true
fi

if [ "$HAS_LOCAL_DB" = true ]; then
  echo -e "${GREEN}✓  Local database configured — starting full stack${NC}"
else
  echo -e "${YELLOW}ℹ  No local DATABASE_URL found in web/.env${NC}"
  echo -e "   Mobile will connect to the deployed Vercel backend."
  echo ""
  echo -e "   To run the web server locally too, add a DATABASE_URL to web/.env"
  echo -e "   (free at ${CYAN}https://neon.tech${NC})"
  echo ""
fi

WEB_PID=""

if [ "$HAS_LOCAL_DB" = true ]; then
  # ─── Install web dependencies ───────────────────────────────────────────────
  echo ""
  echo -e "${YELLOW}→  Installing web dependencies...${NC}"
  cd web
  if [ ! -d node_modules ]; then
    npm install --silent
  fi
  echo -e "${GREEN}✓  Web dependencies ready${NC}"
  cd ..

  # ─── Update mobile .env with local backend URL ─────────────────────────────
  LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")
  cat > mobile/.env << EOF
EXPO_PUBLIC_API_BASE_URL=http://${LOCAL_IP}:4000
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY=
EOF
  echo -e "${GREEN}✓  Mobile pointed at http://${LOCAL_IP}:4000${NC}"

  # ─── Start web backend ───────────────────────────────────────────────────────
  echo ""
  echo -e "${YELLOW}→  Starting web backend on http://localhost:4000 ...${NC}"
  cd web
  npm run dev &
  WEB_PID=$!
  cd ..

  # Wait for web to be ready
  echo -e "${YELLOW}   Waiting for backend to start...${NC}"
  for i in {1..30}; do
    if curl -s http://localhost:4000 > /dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  echo -e "${GREEN}✓  Backend is running${NC}"
fi

# ─── Install mobile dependencies ─────────────────────────────────────────────
echo ""
echo -e "${YELLOW}→  Installing mobile dependencies...${NC}"
cd mobile
if [ ! -d node_modules ]; then
  npm install --silent
fi
echo -e "${GREEN}✓  Mobile dependencies ready${NC}"
cd ..

# ─── Start Expo ───────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}  ✓ Ready!${NC}"
echo ""
echo -e "${BOLD}  To preview on your phone:${NC}"
echo "  1. Install the ${CYAN}Expo Go${NC} app on your iPhone or Android"
echo "  2. Scan the QR code that appears below"
echo ""
echo -e "${BOLD}  To preview on your Mac:${NC}"
echo "  Press ${CYAN}i${NC} for iPhone simulator (requires Xcode)"
echo ""
echo "  Press Ctrl+C to stop everything"
echo ""
echo "  ─────────────────────────────────────────"
echo ""

cd mobile
npx expo start --clear

# ─── Cleanup ──────────────────────────────────────────────────────────────────
if [ -n "$WEB_PID" ]; then
  kill $WEB_PID 2>/dev/null
fi

