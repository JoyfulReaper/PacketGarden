# Initial Event Mappings

These mappings are intentionally playful and provisional. The goal is to create visually distinct behavior, not to encode a perfect taxonomy of network traffic.

| Event | Garden effect | Notes |
| --- | --- | --- |
| DNS request | Small clustered flowers | Common, quick, numerous growth. |
| HTTP request | Broad-leaf plant | Ordinary web traffic should look healthy and common. |
| HTTPS request | Flowering broad-leaf plant | Similar family to HTTP, with a slightly more elaborate appearance. |
| SSH connection | Thorny vine | Long narrow growth that can climb or spread. |
| Gopher request | Mushroom | A little old-network fungus patch. |
| Gemini request | Crystal-like fungus | More luminous / geometric than Gopher mushrooms. |
| Failed authentication | Red bloom that quickly wilts | Short-lived visual warning without becoming an alarm UI. |
| Long-lived connection | Slow-growing tree | Duration can affect trunk/ring/branch growth. |
| Traffic burst | Rain / pollen / wind event | Environmental effect rather than another permanent plant. |
| Port scan / noisy probing | Invasive weed patch | Can spread briefly or crowd nearby growth. |
| Unusual high-port activity | Mutated plant | Good place for randomized shapes/colors later. |
| Service recovery | New green shoot / bloom | Positive counterpart to failure events. |
| Service failure | Darkened or drooping plant | Should be noticeable but not turn the whole app into an incident dashboard. |
| Quiet period | Night / stillness | The garden can visibly rest when event volume drops. |

## Mapping principles

- Common events should create small/common growth so they do not immediately overwhelm the garden.
- Rare events can produce larger or stranger specimens.
- Severity or intensity can affect size, mutation chance, animation, or lifespan.
- Duration can affect growth over time rather than only spawn size.
- Environmental effects are useful for bursty events that should not create hundreds of permanent objects.
- Similar protocols can share a visual family while still remaining recognizable.

## First prototype subset

For the first working version, use only:

1. DNS -> flowers
2. HTTP -> broad-leaf plant
3. SSH -> thorny vine
4. Gopher -> mushroom
5. failed authentication -> red bloom / wilt

Everything else can wait until those five feel good.
