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
if [ ! -f web/.env ] || ! grep -q "DATABASE_URL=postgresql" web/.env 2>/dev/null; then
  echo -e "${RED}✗  web/.env is not set up yet.${NC}"
  echo ""
  echo "  Please follow these steps:"
  echo ""
  echo "  1. Go to ${CYAN}https://neon.tech${NC} → sign up free → create a project"
  echo "  2. Click 'Connection string' and copy the postgresql://... URL"
  echo "  3. Copy the template:  cp web/.env.example web/.env"
  echo "  4. Open web/.env and paste your DATABASE_URL"
  echo "  5. Run this script again: ${BOLD}bash start.sh${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}✓  web/.env found${NC}"

# ─── Install web dependencies ─────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}→  Installing web dependencies...${NC}"
cd web
if [ ! -d node_modules ]; then
  npm install --silent
fi
echo -e "${GREEN}✓  Web dependencies ready${NC}"
cd ..

# ─── Install mobile dependencies ─────────────────────────────────────────────
echo ""
echo -e "${YELLOW}→  Installing mobile dependencies...${NC}"
cd mobile
if [ ! -d node_modules ]; then
  npm install --silent
fi
echo -e "${GREEN}✓  Mobile dependencies ready${NC}"
cd ..

# ─── Update mobile .env with local backend URL ───────────────────────────────
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")
cat > mobile/.env << EOF
EXPO_PUBLIC_API_BASE_URL=http://${LOCAL_IP}:3000
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY=
EOF
echo -e "${GREEN}✓  Mobile pointed at http://${LOCAL_IP}:3000${NC}"

# ─── Start web backend ────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}→  Starting web backend on http://localhost:3000 ...${NC}"
cd web
npm run dev &
WEB_PID=$!
cd ..

# Wait for web to be ready
echo -e "${YELLOW}   Waiting for backend to start...${NC}"
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    break
  fi
  sleep 1
done
echo -e "${GREEN}✓  Backend is running${NC}"

# ─── Start Expo ───────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}  ✓ Everything is running!${NC}"
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
kill $WEB_PID 2>/dev/null
