// @ts-nocheck
export function getProductImage(item) {
  if (!item.media) return "https://picsum.photos/200/200?random=" + item.id;
  if (Array.isArray(item.media) && item.media.length > 0) return item.media[0];
  if (typeof item.media === "string") return item.media;
  return "https://picsum.photos/200/200?random=" + item.id;
}

export function convertVideoItemToProduct(videoItem) {
  return {
    id: videoItem.id,
    name: videoItem.productName,
    productName: videoItem.productName,
    price: videoItem.productPrice,
    productPrice: videoItem.productPrice,
    username: videoItem.username,
    seller: videoItem.username,
    image: videoItem.thumbnail,
    images: [videoItem.thumbnail],
    description: videoItem.description,
    inStock: true,
  };
}
