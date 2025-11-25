export const getItemImageUrl = (itemId: number): string => {
  const baseUrl = process.env.NEXT_PUBLIC_ITEM_IMAGE_BASE_URL?.trim()

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_ITEM_IMAGE_BASE_URL is not defined in environment variables.')
  }

  return `${baseUrl}/${itemId}.gif`
}

