/* Edit dialog, settings, search, and startup */

editBookForm.addEventListener("submit", saveBookEdits);
bindEditFieldSanitizers(editBookForm);
initListCoverPicker();
ensureListCoverPreviewObserver();
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

settingsTabAbout.addEventListener("click", () => {
  selectSettingsTab("about");
});

settingsTabSettings.addEventListener("click", () => {
  selectSettingsTab("settings");
});

editTabDetails.addEventListener("click", () => {
  selectEditDialogTab("details");
});

editTabListCrop.addEventListener("click", () => {
  selectEditDialogTab("list-crop");
});

if (editTagAddBtn) {
  editTagAddBtn.addEventListener("click", () => {
    commitEditTagInput();
  });
}

if (editTagSuggest) {
  editTagSuggest.addEventListener("mousedown", (event) => {
    const item = event.target.closest("[data-suggest-index]");
    if (!item) {
      return;
    }
    event.preventDefault();
    pickEditTagSuggestion(Number(item.dataset.suggestIndex));
  });
}

if (editTagInput) {
  editTagInput.addEventListener("input", () => {
    updateEditTagSuggest();
  });

  editTagInput.addEventListener("keydown", (event) => {
    const items = getEditTagSuggestItems();
    const suggestOpen = items.length > 0 && !editTagSuggest.hidden;

    if (event.key === "Enter") {
      event.preventDefault();
      if (suggestOpen && editTagSuggestIndex >= 0) {
        pickEditTagSuggestion(editTagSuggestIndex);
      } else {
        commitEditTagInput();
      }
      return;
    }

    if (!suggestOpen) {
      if (event.key === "Escape") {
        hideEditTagSuggest();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      editTagSuggestIndex = (editTagSuggestIndex + 1) % items.length;
      renderEditTagSuggest();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      editTagSuggestIndex =
        editTagSuggestIndex <= 0 ? items.length - 1 : editTagSuggestIndex - 1;
      renderEditTagSuggest();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      hideEditTagSuggest();
    }
  });

  editTagInput.addEventListener("blur", () => {
    window.setTimeout(() => {
      hideEditTagSuggest();
    }, 120);
  });
}

if (editTagsCurrent) {
  editTagsCurrent.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".edit-tag-remove");
    if (!removeBtn) {
      return;
    }
    event.preventDefault();
    const tag = removeBtn
      .closest(".edit-tag-chip")
      ?.querySelector(".edit-tag-chip-label")?.textContent;
    if (tag) {
      removeEditingBookTag(tag);
    }
  });
}

if (editTagsPoolList) {
  editTagsPoolList.addEventListener("click", (event) => {
    const button = event.target.closest(".edit-tag-pool-btn");
    if (!button) {
      return;
    }
    event.preventDefault();
    addEditingBookTag(button.textContent);
  });
}

if (storageModeLocalInput) {
  storageModeLocalInput.addEventListener("change", () => {
    if (storageModeLocalInput.checked) {
      onStorageModeChange("local");
    }
  });
}

if (storageModeGistInput) {
  storageModeGistInput.addEventListener("change", () => {
    if (storageModeGistInput.checked) {
      onGistSetupSelected();
    }
  });
}

if (gistConnectBtn) {
  gistConnectBtn.addEventListener("click", () => {
    onGistConnectClick();
  });
}

if (gistClearBtn) {
  gistClearBtn.addEventListener("click", () => {
    onGistClearClick();
  });
}

if (exportCollectionBtn) {
  exportCollectionBtn.addEventListener("click", () => {
    exportCollectionCsv();
  });
}

if (importCollectionBtn && importCollectionInput) {
  importCollectionBtn.addEventListener("click", () => {
    importCollectionInput.click();
  });
  importCollectionInput.addEventListener("change", () => {
    onImportCollectionFileSelected(importCollectionInput);
  });
}

if (highlightWantsInput) {
  highlightWantsInput.addEventListener("change", () => {
    highlightWants = highlightWantsInput.checked;
    saveUserState();
    render();
  });
}

if (highlightCollectionInput) {
  highlightCollectionInput.addEventListener("change", () => {
    highlightCollection = highlightCollectionInput.checked;
    saveUserState();
    render();
  });
}

if (showMagazinesInput) {
  showMagazinesInput.addEventListener("change", () => {
    showMagazines = showMagazinesInput.checked;
    saveUserState();
    render();
  });
}

if (bookOrderBtn) {
  bookOrderBtn.addEventListener("click", () => {
    if (bookOrderDialog.hidden) {
      openBookOrderDialog();
    } else {
      closeBookOrderDialog();
    }
  });
}

if (bookOrderCloseBtn) {
  bookOrderCloseBtn.addEventListener("click", closeBookOrderDialog);
}

if (bookOrderCancelBtn) {
  bookOrderCancelBtn.addEventListener("click", closeBookOrderDialog);
}

if (bookOrderSaveBtn) {
  bookOrderSaveBtn.addEventListener("click", () => {
    saveBookOrderDialog();
  });
}

if (bookOrderDialog) {
  bookOrderDialog.querySelectorAll("[data-close-book-order]").forEach((element) => {
    element.addEventListener("click", closeBookOrderDialog);
  });
}

if (bookOrderList) {
  bookOrderList.addEventListener("click", onBookOrderListClick);
  bookOrderList.addEventListener("dragstart", onBookOrderDragStart);
  bookOrderList.addEventListener("dragover", onBookOrderDragOver);
  bookOrderList.addEventListener("dragleave", onBookOrderDragLeave);
  bookOrderList.addEventListener("drop", onBookOrderDrop);
  bookOrderList.addEventListener("dragend", onBookOrderDragEnd);
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
  if (event.key === "Escape" && !editDialog.hidden) {
    if (editTagSuggest && !editTagSuggest.hidden) {
      hideEditTagSuggest();
      return;
    }
    closeEditDialog();
    return;
  }
  if (event.key === "Escape" && !settingsDialog.hidden) {
    closeSettingsDialog();
    return;
  }
  if (event.key === "Escape" && bookOrderDialog && !bookOrderDialog.hidden) {
    closeBookOrderDialog();
    return;
  }
  if (event.key === "Escape" && !attributionDialog.hidden) {
    closeAttributionDialog();
  }
});

sortSelect.addEventListener("change", onSortChange);
showHiddenInput.addEventListener("change", () => {
  refreshBookOrderDialogIfOpen();
  render();
});

syncSettingsStorageMode();
updateSortControlVisibility();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    pullGistStateIfConfigured();
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    pullGistStateIfConfigured();
  }
});

if (headerFiltersToggle) {
  headerFiltersToggle.addEventListener("click", () => {
    headerFiltersExpanded = !headerFiltersExpanded;
    saveUserState();
    updateHeaderFiltersState();
  });
}

if (viewModeToggle) {
  viewModeToggle.addEventListener("click", () => {
    gridViewMode = gridViewMode === "list" ? "cards" : "list";
    saveUserState();
    updateViewModeState();
    render();
  });
}

function startViewer() {
  loadUserStateAsync().then(() => {
    render();
    openBookDetailFromLocation();
  });
}

if (readOnly) {
  startViewer();
} else {
  checkServeSupport().then(() => {
    startViewer();
  });
}

})();
