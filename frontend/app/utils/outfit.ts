export interface OutfitParams {
  id: number
  addons: number
  head: number
  body: number
  legs: number
  feet: number
}

export const makeOutfit = (params: OutfitParams): string => {
  const baseUrl = process.env.NEXT_PUBLIC_OUTFIT_IMAGE_BASE_URL?.trim()

  const { id, addons, head, body, legs, feet } = params

  const url = new URL(baseUrl)
  const searchParams = new URLSearchParams()

  searchParams.set('id', String(id))
  searchParams.set('addons', String(addons))
  searchParams.set('head', String(head))
  searchParams.set('body', String(body))
  searchParams.set('legs', String(legs))
  searchParams.set('feet', String(feet))

  url.search = searchParams.toString()

  return url.toString()
}
