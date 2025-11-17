package com.university.lms.ai.service;

import com.university.lms.ai.dto.*;
import org.springframework.stereotype.Service;
import org.tribuo.Example;
import org.tribuo.MutableDataset;
import org.tribuo.Prediction;
import org.tribuo.Trainer;
import org.tribuo.impl.ArrayExample;
import org.tribuo.math.optimisers.AdaGrad;
import org.tribuo.regression.RegressionFactory;
import org.tribuo.regression.Regressor;
import org.tribuo.regression.evaluation.RegressionEvaluation;
import org.tribuo.regression.rtree.CARTRegressionTrainer;
import org.tribuo.regression.sgd.linear.LinearSGDTrainer;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PredictionService {

    public PredictionResponseDto getStudentPredictions(PredictionRequestDto request) {
        if (request.getStudents() == null || request.getStudents().isEmpty()) {
            return new PredictionResponseDto(new ArrayList<>());
        }

        // 1. Create a dataset
        RegressionFactory factory = new RegressionFactory();
        MutableDataset<Regressor> trainingDataset = new MutableDataset<>(factory);

        for (StudentDataDto student : request.getStudents()) {
            if (student.getGrades() != null && !student.getGrades().isEmpty()) {
                double averageGrade = student.getGrades().stream().mapToDouble(d -> d).average().orElse(0);
                String[] featureNames = {"progress", "averageGrade"};
                double[] featureValues = {student.getProgress(), averageGrade};
                Regressor regressor = new Regressor("grade", student.getGrades().get(student.getGrades().size() - 1));
                Example<Regressor> example = new ArrayExample<>(regressor, featureNames, featureValues);
                trainingDataset.add(example);
            }
        }

        if (trainingDataset.isEmpty()) {
            return new PredictionResponseDto(new ArrayList<>());
        }

        // 2. Train a model
        Trainer<Regressor> trainer = new LinearSGDTrainer(
                new AdaGrad(1.0), // Optimiser
                5,               // Epochs
                1,               // Minibatch size
                1L               // Seed
        );
        var model = trainer.train(trainingDataset);

        // 3. Make predictions
        List<StudentPredictionDto> predictions = request.getStudents().stream()
                .map(student -> {
                    double averageGrade = student.getGrades().stream().mapToDouble(d -> d).average().orElse(0);
                    String[] featureNames = {"progress", "averageGrade"};
                    double[] featureValues = {student.getProgress(), averageGrade};
                    Example<Regressor> example = new ArrayExample<>(new Regressor("grade", 0), featureNames, featureValues);

                    Prediction<Regressor> prediction = model.predict(example);
                    double predictedValue = prediction.getOutput().getValues()[0];

                    return new StudentPredictionDto(student.getStudentId(), predictedValue, prediction.getOutput().getScore());
                })
                .collect(Collectors.toList());

        return new PredictionResponseDto(predictions);
    }
}

