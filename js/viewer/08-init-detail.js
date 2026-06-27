/* Detail overlay and cover lightbox event listeners */

bookDetailCloseBtn.addEventListener("click", closeBookDetail);
bookDetailCover.addEventListener("click", handleCoverZoomTrigger);
bookDetailPrevBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  navigateDetail(-1);
});
bookDetailNextBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  navigateDetail(1);
});
bookDetailDialog.addEventListener("click", (event) => {
  const tagRemove = event.target.closest(".book-detail-tag-remove");
  if (tagRemove) {
    event.preventDefault();
    event.stopPropagation();
    const label = tagRemove
      .closest(".book-detail-tag-chip")
      ?.querySelector(".book-detail-tag")
      ?.textContent;
    if (label) {
      removeDetailBookTag(label);
    }
    return;
  }

  const fieldChip = event.target.closest(".book-detail-field-chip");
  if (fieldChip) {
    event.preventDefault();
    event.stopPropagation();
    applyFieldSearch(fieldChip.dataset.searchField, fieldChip.textContent);
    return;
  }

  const tagButton = event.target.closest(".book-detail-tag");
  if (tagButton) {
    event.preventDefault();
    event.stopPropagation();
    applyFieldSearch("tag", tagButton.textContent);
    return;
  }

  const editButton = event.target.closest(".book-detail-edit-btn");
  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    openEditDialog(Number(editButton.dataset.bookId));
    return;
  }

  const collectionButton = event.target.closest(".collection-btn");
  if (collectionButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleCollection(Number(collectionButton.dataset.bookId));
    return;
  }

  const wantButton = event.target.closest(".want-btn");
  if (!wantButton || wantButton.classList.contains("want-badge")) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  toggleWant(Number(wantButton.dataset.bookId));
});
bookDetailDialog
  .querySelectorAll("[data-close-detail]")
  .forEach((element) => {
    element.addEventListener("click", closeBookDetail);
  });

if (coverLightbox) {
  coverLightbox.addEventListener("click", (event) => {
    if (event.target.closest(".cover-lightbox-img")) {
      if (isMobileCoverLightboxViewport()) {
        closeCoverLightbox();
      }
      return;
    }
    closeCoverLightbox();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (coverLightbox && !coverLightbox.hidden) {
    event.preventDefault();
    closeCoverLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (coverLightbox && !coverLightbox.hidden) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateCoverLightbox(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateCoverLightbox(1);
      return;
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !bookDetailDialog.hidden) {
    closeBookDetail();
    return;
  }
  if (
    !bookDetailDialog.hidden &&
    editDialog.hidden &&
    (!coverLightbox || coverLightbox.hidden)
  ) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateDetail(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateDetail(1);
    }
  }
});
