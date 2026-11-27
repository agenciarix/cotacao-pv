import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Quando o checkout roda dentro do site do cliente (cliente.com.br/cotacao),
  // os arquivos JS/CSS precisam vir do nosso endereço, não do site do cliente.
  // Ex.: ASSET_PREFIX=https://app.cotacaopv.com.br
  assetPrefix: process.env.ASSET_PREFIX || undefined,
};

export default nextConfig;
