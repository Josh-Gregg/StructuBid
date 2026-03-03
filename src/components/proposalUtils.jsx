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

  const calculateDerived = (currentDistMarkup) => {
    const totalWithMarkup = subtotal + currentDistMarkup;
    
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
    
    return { totalWithMarkup, discount, totalAfterDiscount, tax, contingency, changeOrdersTotal, grandTotal };
  };

  let derived = calculateDerived(distMarkup);

  if (proposal.round_up_type && proposal.round_up_type !== 'none' && totalLineItemsForMarkup > 0) {
    let targetGrandTotal = derived.grandTotal;
    if (proposal.round_up_type === 'dollar') targetGrandTotal = Math.ceil(derived.grandTotal);
    else if (proposal.round_up_type === 'ten') targetGrandTotal = Math.ceil(derived.grandTotal / 10) * 10;
    else if (proposal.round_up_type === 'hundred') targetGrandTotal = Math.ceil(derived.grandTotal / 100) * 100;
    
    const diff = targetGrandTotal - derived.grandTotal;
    if (diff > 0.001) {
      let multiplier = 1;
      if (proposal.discount_type === 'percentage') multiplier *= (1 - (proposal.discount_amount || 0) / 100);
      if (proposal.tax_type === 'percentage') multiplier *= (1 + (proposal.tax_amount || 0) / 100);
      multiplier *= (1 + (proposal.contingency_percentage || 0) / 100);
      
      if (multiplier > 0) {
        distMarkup += (diff / multiplier);
        derived = calculateDerived(distMarkup);
        // Force exact target to avoid small floating point discrepancies
        derived.grandTotal = targetGrandTotal;
      }
    }
  }
  
  return { subtotal, distMarkup, ...derived, totalLineItemsForMarkup, markupableSubtotal };
}