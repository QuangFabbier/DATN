import asyncHandler from '../utils/asyncHandler.js'
import { recordOrderCompletionInventory } from '../services/inventoryService.js'

const consumeOrderInventoryHandler = asyncHandler(async (req, res) => {
  const result = await recordOrderCompletionInventory(req.body, req.user)

  res.status(200).json({
    message: 'Cap nhat ton kho don hang thanh cong.',
    ...result,
  })
})

export { consumeOrderInventoryHandler }
