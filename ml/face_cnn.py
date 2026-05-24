"""
Lightweight CNN for face-image classification (e.g. student ID after face detection/alignment).

Input: RGB tensors of shape (N, 3, 112, 112), values normalized with ImageNet stats.
"""

from __future__ import annotations

import torch
import torch.nn as nn


class FaceAttendanceCNN(nn.Module):
    """
    Stack of conv blocks + global pooling + classifier.
    `num_classes` should match the number of identity folders under train/ (ImageFolder).
    """

    def __init__(self, num_classes: int, dropout: float = 0.4) -> None:
        super().__init__()
        if num_classes < 2:
            raise ValueError("num_classes must be at least 2 for classification training.")

        self.features = nn.Sequential(
            self._conv_block(3, 32),
            self._conv_block(32, 64),
            self._conv_block(64, 128),
            self._conv_block(128, 256),
            nn.AdaptiveAvgPool2d(1),
        )
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(p=dropout),
            nn.Linear(256, num_classes),
        )

    @staticmethod
    def _conv_block(in_c: int, out_c: int) -> nn.Sequential:
        return nn.Sequential(
            nn.Conv2d(in_c, out_c, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_c),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_c, out_c, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_c),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        return self.head(x)
