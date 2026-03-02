export function computeTotals(proposal) {
  let subtotal = 0;
  let markupableSubtotal = 0;
  let totalLineItemsForMarkup = 0;

  proposal.categories?.forEach(cat => {
    cat.line_items?.forEach(item => {
      const itemSub = (item.quantity || 0) * (item.cost_per_unit || 0) * (1 + (item.markup_percentage || 0) / 100);
      subtotal += itemSub;
      if (!item.exclude_from_markup) {
        markupableSubtotal += itemSub;
        totalLineItemsForMarkup += 1;
      }
    });
  });
  
  let distMarkup = 0;
  if (proposal.overall_markup_type === 'flat') {
    distMarkup = proposal.overall_markup_percentage || 0;
  } else {
    distMarkup = markupableSubtotal * ((proposal.overall_markup_percentage || 0) / 100);
  }
  const totalWithMarkup = subtotal + distMarkup;
  
  let discount = proposal.discount_amount || 0;
  if (proposal.discount_type === 'percentage') {
    discount = totalWithMarkup * (discount / 100);
  }
  
  const totalAfterDiscount = totalWithMarkup - discount;
  
  let tax = proposal.tax_amount || 0;
  if (proposal.tax_type === 'percentage') {
    tax = totalAfterDiscount * (tax / 100);
  }
  
  const contingency = (totalAfterDiscount + tax) * ((proposal.contingency_percentage || 0) / 100);
  
  let changeOrdersTotal = 0;
  proposal.change_orders?.forEach(co => {
    changeOrdersTotal += (co.amount || 0);
  });

  const grandTotal = totalAfterDiscount + tax + contingency + changeOrdersTotal;
  
  return { subtotal, distMarkup, totalWithMarkup, discount, totalAfterDiscount, tax, contingency, changeOrdersTotal, grandTotal, totalLineItemsForMarkup, markupableSubtotal };
}