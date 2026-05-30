/* Event listeners and application startup */

grid.addEventListener("click", (event) => {
  const editButton = event.target.closest(".edit-book-btn");
  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    openEditDialog(Number(editButton.dataset.bookId));
    return;
  }

  const hideButton = event.target.closest(".hide-book-btn");
  if (hideButton) {
    event.preventDefault();
    event.stopPropagation();
    const bookId = Number(hideButton.dataset.bookId);
    const isHidden = hideButton.dataset.hidden === "true";
    setBookHidden(bookId, !isHidden);
    return;
  }

  if (
    event.target.closest(".book-detail-wiki-btn") ||
    event.target.closest(".book-detail-goodreads-btn")
  ) {
    return;
  }

  const card = event.target.closest(".card");
  if (card) {
    openBookDetail(Number(card.dataset.bookId));
  }
});

bookDetailCloseBtn.addEventListener("click", closeBookDetail);
bookDetailPrevBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  navigateDetail(-1);
});
bookDetailNextBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  navigateDetail(1);
});
bookDetailDialog.addEventListener("click", (event) => {
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

editBookForm.addEventListener("submit", saveBookEdits);
bindEditFieldSanitizers(editBookForm);
editDeleteBtn.addEventListener("click", deleteBook);
editCancelBtn.addEventListener("click", closeEditDialog);
editDialog.querySelectorAll("[data-close-edit]").forEach((element) => {
  element.addEventListener("click", closeEditDialog);
});

settingsBtn.addEventListener("click", () => {
  if (settingsDialog.hidden) {
    openSettingsDialog();
  } else {
    closeSettingsDialog();
  }
});

settingsCloseBtn.addEventListener("click", closeSettingsDialog);
settingsDialog.querySelectorAll("[data-close-settings]").forEach((element) => {
  element.addEventListener("click", closeSettingsDialog);
});

collectionSourceSampleInput.addEventListener("change", () => {
  if (collectionSourceSampleInput.checked) {
    onCollectionSourceChange("sample");
  }
});

collectionSourceOwnInput.addEventListener("change", () => {
  if (collectionSourceOwnInput.checked) {
    onCollectionSourceChange("own");
  }
});

if (exportCollectionBtn) {
  exportCollectionBtn.addEventListener("click", () => {
    exportCollectionCsv();
  });
}

if (resetSampleCollectionBtn) {
  resetSampleCollectionBtn.addEventListener("click", () => {
    showResetSampleConfirm();
  });
}

if (resetSampleCancelBtn) {
  resetSampleCancelBtn.addEventListener("click", () => {
    hideResetSampleConfirm();
  });
}

if (resetSampleConfirmBtn) {
  resetSampleConfirmBtn.addEventListener("click", () => {
    resetSampleCollection();
  });
}

attributionBtn.addEventListener("click", () => {
  if (attributionDialog.hidden) {
    openAttributionDialog();
  } else {
    closeAttributionDialog();
  }
});

attributionCloseBtn.addEventListener("click", closeAttributionDialog);
attributionDialog.querySelectorAll("[data-close-attribution]").forEach((element) => {
  element.addEventListener("click", closeAttributionDialog);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !bookDetailDialog.hidden) {
    closeBookDetail();
    return;
  }
  if (!bookDetailDialog.hidden) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateDetail(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateDetail(1);
      return;
    }
  }
  if (event.key === "Escape" && !editDialog.hidden) {
    closeEditDialog();
    return;
  }
  if (event.key === "Escape" && !settingsDialog.hidden) {
    closeSettingsDialog();
    return;
  }
  if (event.key === "Escape" && !attributionDialog.hidden) {
    closeAttributionDialog();
  }
});

function updateSearchClearVisibility() {
  searchClearBtn.hidden = !searchInput.value;
}

function onSearchChange() {
  updateSearchClearVisibility();
  render();
}

searchClearBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  onSearchChange();
});

searchInput.addEventListener("input", onSearchChange);
searchInput.addEventListener("search", onSearchChange);
searchInput.addEventListener("change", onSearchChange);
sortSelect.addEventListener("change", onSortChange);
showHiddenInput.addEventListener("change", render);

loadWantList();
restoreCollectionSourcePreference();
syncSettingsCollectionRadios();
loadOwnCollectionIds();
loadHeaderFiltersPreference();
updateHeaderFiltersState();
restoreSortPreference();

if (headerFiltersToggle) {
  headerFiltersToggle.addEventListener("click", () => {
    headerFiltersExpanded = !headerFiltersExpanded;
    saveHeaderFiltersPreference();
    updateHeaderFiltersState();
  });
}

stats.addEventListener("click", (event) => {
  if (event.target.closest("#collection-filter-toggle")) {
    const next = !collectionOnly;
    collectionOnly = next;
    if (next) {
      wantOnly = false;
    }
    render();
    return;
  }
  if (event.target.closest("#hidden-filter-toggle")) {
    hiddenOnly = !hiddenOnly;
    render();
    return;
  }
  if (event.target.closest("#mycroft-filter-toggle")) {
    mycroftOnly = !mycroftOnly;
    render();
    return;
  }
  if (event.target.closest("#want-filter-toggle")) {
    const next = !wantOnly;
    wantOnly = next;
    if (next) {
      collectionOnly = false;
    }
    render();
    return;
  }
});

checkServeSupport()
  .then(() => ensureSampleCollectionIds())
  .then(render);

})();
